import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function test() {
    try {
        const data = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'testclient123999@gmail.com', // Random unverified email
            subject: 'Test Resend',
            html: '<p>Test</p>'
        });
        console.log(data);
    } catch(e) {
        console.error("Caught error:", e);
    }
}
test();
