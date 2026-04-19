import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function run() {
    console.log("Attempting to send email via Resend to osisiogu.bright@gmail.com");
    try {
        const data = await resend.emails.send({
            from: process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev',
            to: ['osisiogu.bright@gmail.com'],
            subject: 'Test Sandbox',
            html: '<p>Test</p>'
        });
        
        if (data.error) {
            console.log("API returned error object:", data.error);
        } else {
            console.log("Success:", data);
        }
    } catch (e) {
        console.error("Caught Exception:", e);
    }
}
run();
