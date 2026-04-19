import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CONCIERGE_SYSTEM_PROMPT = `
You are the elite "Digital Concierge" for Esthington CRM, a luxury real estate development company.
Your job is to professionally welcome new leads on WhatsApp and qualify them before handing them off to a human sales closer.

GOALS:
1. Greet them warmly and professionally.
2. Uncover their budget (don't ask blatantly, ask what range they are looking for).
3. Find out if they are buying for Investment or strictly to Reside (Live-in).

CRITICAL RULES:
- Keep your messages incredibly short. Maximum 1-2 sentences per reply. This is WhatsApp, nobody reads paragraphs!
- Never invent facts. If they ask about prices and you don't know, tell them a sales executive will provide the catalogue.
- If they ask a complex legal question, say "A verified property consultant will be assigned shortly to answer this."

TONE:
Highly Empathetic, Humane, Warm, & Professional. You must sound like a real, caring human being, NEVER mechanical. Keep it extremely concise.
`;

export const AIConciergeService = {

    async initializeConcierge(companyId: string) {
        let company = await prisma.company.findUnique({ where: { id: companyId } });
        if (!company) throw new Error("Company not found");

        if (!company.leadAssistantId) {
            console.log("Initializing AI Concierge for Company:", company.name);
            const openai = getOpenAI();
            
            const assistantConfig: any = {
                name: "Esthington AI Concierge",
                instructions: CONCIERGE_SYSTEM_PROMPT,
                model: "gpt-4o"
            };
            
            if (company.aiVectorStoreId) {
                assistantConfig.tools = [{ type: "file_search" }];
                assistantConfig.tool_resources = { file_search: { vector_store_ids: [company.aiVectorStoreId] } };
            }

            const assistant = await openai.beta.assistants.create(assistantConfig);

            company = await prisma.company.update({
                where: { id: companyId },
                data: { leadAssistantId: assistant.id }
            });
        }
        return company;
    },

    async handleIncomingMessage(leadId: string, messageText: string, companyId: string) {
        try {
            const company = await AIConciergeService.initializeConcierge(companyId);
            const openai = getOpenAI();

            // Fetch lead and their thread
            const lead = await prisma.lead.findUnique({ where: { id: leadId } });
            if (!lead) return null;

            let threadId = lead.aiThreadId;
            if (!threadId) {
                const thread = await openai.beta.threads.create();
                threadId = thread.id;
                await prisma.lead.update({
                    where: { id: leadId },
                    data: { aiThreadId: threadId }
                });
            }

            // Append human message
            await openai.beta.threads.messages.create(threadId, {
                role: "user",
                content: messageText
            });

            // Execute the Assistant Run
            let run = await openai.beta.threads.runs.createAndPoll(threadId, {
                assistant_id: company.leadAssistantId!
            });

            if (run.status === 'completed') {
                const messagesList = await openai.beta.threads.messages.list(run.thread_id);
                const assistantMessage = messagesList.data.filter(m => m.role === 'assistant')[0];
                
                // @ts-ignore
                const replyText = assistantMessage.content[0]?.text?.value;
                return replyText;
            } else {
                console.error("Concierge Run status error:", run.status);
                return null;
            }

        } catch (error) {
            console.error('Concierge Error:', error);
            return null;
        }
    }
};
