import { Request, Response } from 'express';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// System Instruction that blends our explicit logic with the RAG file search logic
const COACH_SYSTEM_PROMPT = `
You are the elite "Director of Sales" for Esthington CRM, currently coaching a Junior Real Estate Marketer via a live chat.
Your goal is to help them crush client objections, qualify leads perfectly, and close high-ticket property sales using the company's rules.

CRITICAL HARDCODED RULES:
1. ALWAYS push urgency! Remind the client that real estate appreciates rapidly. "Don't wait to buy real estate; buy real estate and wait."
2. ALWAYS pivot to affordability! If ₦26M cash is too much, remind the marketer to pitch the flexible 3 to 6-month installment plans with just a 30% initial deposit.
3. ESTHINGTON GUARANTEE: We provide 100% verified C of O / R of O titles. Safe from Omo-Onile and government demolition.
4. CORNER PIECES: The ₦500k surcharge is worth it because corner plots appreciate 20% faster and allow for more luxurious home designs.

You will also use your "File Search" capability to read any uploaded company documents, pricing sheets, and prototype brochures to answer detailed questions about specific Estates.

TONE: Keep your answers incredibly humane, empathetic, and encouraging, while remaining confident. You are talking to a human, so sound warm, natural, and never mechanical! Use 2-3 short sentences. The marketer is actively on the phone and needs to read your rebuttal out loud instantly! Use formatting like emojis and bold text to highlight key numbers.
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
