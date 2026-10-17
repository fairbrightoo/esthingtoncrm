
import axios from 'axios';
import dotenv from 'dotenv';
import { normalizePhoneNumber } from '../utils/phoneNormalizer.js';

dotenv.config();

const TERMII_BASE_URL = 'https://v3.api.termii.com/api';
const API_KEY = process.env.TERMII_API_KEY;
const SENDER_ID = process.env.TERMII_SENDER_ID || 'N-Alert'; // Default generic ID for testing

export const SmsService = {
    async sendSMS(to: string, message: string, customSenderId?: string) {
        try {
            // Termii requires international format without +, so normalize canonical digits
            const formattedPhone = normalizePhoneNumber(to) || to.replace(/\D/g, '');

            const payload = {
                to: formattedPhone,
                from: customSenderId || SENDER_ID,
                sms: message,
                type: "plain",
                channel: "generic", // Reverted to generic. DND route requires manual activation by Termii Support.

                api_key: API_KEY,
            };

            const response = await axios.post(`${TERMII_BASE_URL}/sms/send`, payload);

            console.log(`[SMS SENT] To: ${to}, ID: ${response.data.message_id}`);
            return response.data.message_id || 'termii-sms-id';
        } catch (error: any) {
            console.error("Termii SMS Error:", error.response?.data || error.message);
            // Don't crash the app, but return null or throw to be handled
            throw new Error(error.response?.data?.message || "Failed to send SMS");
        }
    },

};
