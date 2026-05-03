import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function test() {
    try {
        console.log("Sending email...");
        const data = await resend.emails.send({
            from: 'garki.dkel@esthingtongroup.org',
            to: 'tecsplen@gmail.com', // Random unverified email
            subject: 'Test Resend',
            html: '<p>Test</p>'
        });
        console.log(data);
    } catch(e) {
        console.error("Caught error:", e);
    }
}
test();
