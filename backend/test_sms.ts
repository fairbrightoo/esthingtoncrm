import { SmsService } from './src/services/SmsService.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log("Starting SMS test to 07045763306...");
    try {
        const id = await SmsService.sendSMS('07045763306', 'Test message from Esthington CRM verifying V3 Termii API.');
        console.log("SUCCESS! Message ID:", id);
    } catch (error: any) {
        console.error("FAILED!", error.message);
    }
}
test();
