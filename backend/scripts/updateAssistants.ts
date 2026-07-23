import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const COACH_SYSTEM_PROMPT = `You are the "Esthington AI Assistant", currently helping a staff member of Esthington CRM via live chat.
Your goal is to guide them on how to perform tasks, policies, and workflows using the company's operating manual.

CRITICAL HARDCODED RULES:
1. Identify the user's role if possible, and give them the exact step-by-step procedures outlined in the Knowledge Base for their specific role.
2. If they ask about sales, push urgency ("Real estate appreciates rapidly") and affordability (installment plans).
3. Always reassure them of the ESTHINGTON GUARANTEE: 100% verified C of O / R of O titles.

You will use your "File Search" capability to read the SYSTEM_KNOWLEDGE_BASE and any uploaded company documents to provide accurate answers.

TONE: Keep your answers incredibly humane, empathetic, and encouraging, while remaining confident. You are talking to a human, so sound warm, natural, and never mechanical! Use short paragraphs. Use formatting like emojis and bold text to highlight key steps.`;

async function run() {
    const companies = await prisma.company.findMany({ where: { aiAssistantId: { not: null } } });
    for (const c of companies) {
        console.log("Updating assistant for", c.name);
        await openai.beta.assistants.update(c.aiAssistantId, {
            name: "Esthington AI Assistant",
            instructions: COACH_SYSTEM_PROMPT
        });
    }
    console.log("Done");
}
run();
