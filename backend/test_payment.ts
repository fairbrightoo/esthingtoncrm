import { PrismaClient } from '@prisma/client';
import { SaleController } from './src/controllers/SaleController.js';
import { uploadFile } from './src/services/StorageService.js';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function test() {
    // get a sale id
    const sale = await prisma.sale.findFirst();
    if (!sale) {
        console.log("No sales found");
        return;
    }
    const user = await prisma.user.findFirst();
    
    const req = {
        params: { saleId: sale.id },
        body: {
            amount: 1000,
            method: 'TRANSFER',
            reference: 'test',
            userId: user?.id
        },
        files: [
            {
                buffer: Buffer.from('hello world'),
                originalname: 'test.pdf',
                mimetype: 'application/pdf'
            }
        ]
    };
    
    const res = {
        status: (code: number) => ({
            json: (data: any) => {
                console.log(`STATUS: ${code}`, data);
            }
        }),
        json: (data: any) => {
            console.log("OK", data);
        }
    };
    
    // @ts-ignore
    await SaleController.recordPayment(req, res);
}

test().catch(console.error);
