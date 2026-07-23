import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Construct __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const KNOWLEDGE_FILE_PATH = path.join(__dirname, '../docs/SYSTEM_KNOWLEDGE_BASE.md');

async function run() {
    console.log('--- Esthington CRM AI Knowledge Base Updater ---');

    if (!fs.existsSync(KNOWLEDGE_FILE_PATH)) {
        console.error(`❌ Error: Knowledge base file not found at ${KNOWLEDGE_FILE_PATH}`);
        process.exit(1);
    }

    // 1. Fetch all companies that have AI initialized
    const companies = await prisma.company.findMany({
        where: {
            aiVectorStoreId: { not: null }
        }
    });

    if (companies.length === 0) {
        console.log('No companies found with initialized AI Vector Stores. Skipping.');
        process.exit(0);
    }

    for (const company of companies) {
        const vectorStoreId = company.aiVectorStoreId;
        console.log(`\nProcessing Company: ${company.name} (Vector Store: ${vectorStoreId})`);

        try {
            // 2. Fetch all existing files in the vector store
            const vectorFiles = await openai.vectorStores.files.list(vectorStoreId!);
            
            // 3. Delete old SYSTEM_KNOWLEDGE_BASE files to prevent duplication
            for (const vf of vectorFiles.data) {
                try {
                    const fileData = await openai.files.retrieve(vf.id);
                    if (fileData.filename === 'SYSTEM_KNOWLEDGE_BASE.md') {
                        console.log(`Removing old document instance: ${vf.id}`);
                        await openai.vectorStores.files.del(vectorStoreId!, vf.id);
                        await openai.files.del(vf.id);
                    }
                } catch (e: any) {
                    // Ignore missing files
                }
            }

            // 4. Upload the fresh document
            console.log('Uploading fresh SYSTEM_KNOWLEDGE_BASE.md...');
            const fileStream = fs.createReadStream(KNOWLEDGE_FILE_PATH);
            
            const batch = await openai.vectorStores.fileBatches.uploadAndPoll(
                vectorStoreId!,
                { files: [fileStream] }
            );

            console.log(`✅ Success for ${company.name}! Processed ${batch.file_counts.completed} files.`);
            
        } catch (error: any) {
            console.error(`❌ Failed to update ${company.name}:`, error.message);
        }
    }
    
    console.log('\nAll updates complete.');
    process.exit(0);
}

run();
