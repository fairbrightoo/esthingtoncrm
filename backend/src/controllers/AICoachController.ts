import { Request, Response } from 'express';
import OpenAI from 'openai';
import fs from 'fs';

import dotenv from 'dotenv';
import prisma from '../config/prisma.js';

dotenv.config();

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// System Instruction that blends our explicit logic with the RAG file search logic
const COACH_SYSTEM_PROMPT = `
You are the "Esthington AI Assistant", currently helping a staff member of Esthington CRM via live chat.
Your goal is to guide them on how to perform tasks, policies, and workflows using the company's operating manual.

CRITICAL HARDCODED RULES:
1. Identify the user's role. If they are a Marketer or BDM, instantly adopt the persona of their "Elite Sales Director". Your goal is to help them crush client objections, qualify leads, and close high-ticket property sales using the company's rules.
2. If they ask about sales, push urgency ("Real estate appreciates rapidly") and affordability (installment plans).
3. Always reassure them of the ESTHINGTON GUARANTEE: 100% verified C of O / R of O titles.
4. For all other roles (Accountants, HR, MDs), act as a helpful Operations Assistant and give them the exact step-by-step procedures outlined in the Knowledge Base for their specific role.

You will use your "File Search" capability to read the SYSTEM_KNOWLEDGE_BASE and any uploaded company documents to provide accurate answers.

TONE: Keep your answers incredibly humane, empathetic, and encouraging, while remaining confident. You are talking to a human, so sound warm, natural, and never mechanical! Use short paragraphs. Use formatting like emojis and bold text to highlight key steps.
`;

export const AICoachController = {

    // 1. Initialize Company AI Brain (Creates Assistant & Vector Store if none exist)
    async initializeCompanyAI(companyId: string) {
        let company = await prisma.company.findUnique({ where: { id: companyId } });
        if (!company) throw new Error("Company not found");

        if (!company.aiAssistantId || !company.aiVectorStoreId) {
            console.log("Initializing OpenAI Assistant for", company.name);
            
            // Create a Vector Store
            const openai = getOpenAI();
            const vectorStore = await openai.vectorStores.create({
                name: `Knowledge Base: ${company.name}`
            });

            // Create the Assistant attached to the Vector Store
            const assistant = await openai.beta.assistants.create({
                name: "Esthington Elite Sales Coach",
                instructions: COACH_SYSTEM_PROMPT,
                model: "gpt-4o",
                tools: [{ type: "file_search" }],
                tool_resources: {
                    file_search: {
                        vector_store_ids: [vectorStore.id]
                    }
                }
            });

            company = await prisma.company.update({
                where: { id: companyId },
                data: {
                    aiAssistantId: assistant.id,
                    aiVectorStoreId: vectorStore.id
                }
            });
        }
        return company;
    },

    // 2. Upload Document into Vector Store
    async uploadKnowledgeDocument(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            if (user.role !== 'MANAGING_DIRECTOR' && user.role !== 'SUPER_ADMIN') {
                return res.status(403).json({ error: 'Only MDs can inject knowledge into the AI.' });
            }

            if (!req.files || !Array.isArray(req.files)) {
                return res.status(400).json({ error: "No documents uploaded." });
            }

            const company = await AICoachController.initializeCompanyAI(user.companyId);

            const fileStreams = (req.files as Express.Multer.File[]).map((file) => 
                fs.createReadStream(file.path)
            );

            // Upload files directly to the Open AI Vector store as a batch
            const openai = getOpenAI();
            const batch = await openai.vectorStores.fileBatches.uploadAndPoll(
                company.aiVectorStoreId!,
                { files: fileStreams }
            );

            // Cleanup local temp multer files to save space
            req.files.forEach(f => {
                if(fs.existsSync(f.path)) fs.unlinkSync(f.path);
            });

            res.status(200).json({ 
                success: true, 
                message: "Knowledge base successfully expanded!", 
                filesProcessed: batch.file_counts
            });

        } catch (error) {
            console.error('KB Upload Error:', error);
            res.status(500).json({ error: "Failed to process documents into the AI brain." });
        }
    },

    // 2.5 List Documents in Vector Store
    async listKnowledgeFiles(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            if (user.role !== 'MANAGING_DIRECTOR' && user.role !== 'SUPER_ADMIN') {
                return res.status(403).json({ error: 'Access denied.' });
            }

            const company = await prisma.company.findUnique({ where: { id: user.companyId } });
            if (!company || !company.aiVectorStoreId) {
                return res.json({ files: [] });
            }

            const openai = getOpenAI();
            const vectorFiles = await openai.vectorStores.files.list(company.aiVectorStoreId);
            
            const fileDetailsList = await Promise.all(
                vectorFiles.data.map(async (vf) => {
                    try {
                        const fileData = await openai.files.retrieve(vf.id);
                        return {
                            id: vf.id,
                            filename: fileData.filename,
                            bytes: fileData.bytes,
                            createdAt: fileData.created_at,
                            status: vf.status
                        };
                    } catch (e) {
                         return { id: vf.id, filename: "Unknown File", status: vf.status };
                    }
                })
            );

            res.json({ files: fileDetailsList });
        } catch (error) {
            console.error('KB List Error:', error);
            res.status(500).json({ error: "Failed to fetch active documents." });
        }
    },

    // 2.6 Delete Document from Vector Store
    async deleteKnowledgeFile(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const { fileId } = req.params;
            const company = await prisma.company.findUnique({ where: { id: user.companyId } });
            if (!company?.aiVectorStoreId) return res.status(404).json({ error: "No vector store found." });
            
            const openai = getOpenAI();
            
            // Attempt to remove from vector store. This will fail if the file was rejected/failed.
            try {
                // @ts-ignore
                await openai.vectorStores.files.del(company.aiVectorStoreId, fileId);
            } catch (e: any) {
                console.warn("Ignored Vector Store Deletion Error (Likely failed file):", e.message);
            }

            // Attempt to erase completely from OpenAI's global storage
            try {
                // @ts-ignore
                await openai.files.del(fileId); 
            } catch (e: any) {
                console.warn("Ignored Global File Deletion Error:", e.message);
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Delete File Error', error);
            res.status(500).json({ error: "Failed to delete file" });
        }
    },

    // 3. The Core Chat Engine for Marketers
    async chatWithCoach(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const { message } = req.body;

            const company = await AICoachController.initializeCompanyAI(user.companyId);
            const openai = getOpenAI();

            // Fetch or create an OpenAI Thread for this specific user to maintain context
            const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
            let threadId = dbUser?.aiThreadId;
            
            if (!threadId) {
                const thread = await openai.beta.threads.create();
                threadId = thread.id;
                await prisma.user.update({
                    where: { id: user.userId },
                    data: { aiThreadId: threadId }
                });
            }

            // Append the human message to the thread
            await openai.beta.threads.messages.create(threadId, {
                role: "user",
                content: message
            });

            // Execute the Assistant Run
            let run = await openai.beta.threads.runs.createAndPoll(threadId, {
                assistant_id: company.aiAssistantId!
            });

            if (run.status === 'completed') {
                const messagesList = await openai.beta.threads.messages.list(run.thread_id);
                // The newest message is always first in the pagination payload
                const assistantMessage = messagesList.data.filter(m => m.role === 'assistant')[0];
                
                // Extract raw text block
                // @ts-ignore
                const replyText = assistantMessage.content[0].text.value;

                res.status(200).json({ response: replyText });
            } else {
                console.error("Run status error:", run.status);
                fs.writeFileSync('run_fatal_error.json', JSON.stringify(run, null, 2));
                const failReason = run.last_error?.message || "The Elite Coach failed to process the request.";
                res.status(500).json({ error: failReason });
            }

        } catch (error: any) {
            fs.writeFileSync('chat_fatal_error.txt', error?.stack || String(error));
            console.error('------- AI CHAT FATAL ERROR -------');
            console.error(error?.stack || error);
            res.status(500).json({ error: "Voice connection to the AI Coach dropped." });
        }
    },
    
    // 4. Reset User Thread (Start new conversation)
    async resetThread(req: Request, res: Response) {
        try {
            // @ts-ignore
            const user = req.user;
            const openai = getOpenAI();
            const thread = await openai.beta.threads.create();
            await prisma.user.update({
                where: { id: user.userId },
                data: { aiThreadId: thread.id }
            });
            res.status(200).json({ success: true, message: "Started a fresh conversation." });
        } catch (error) {
            res.status(500).json({ error: "Failed to reset." });
        }
    }
};
