import axios from 'axios';
import dotenv from 'dotenv';
import FormData from 'form-data';

dotenv.config();

// Official Meta WhatsApp Cloud API Endpoint Structure:
// https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages
const META_API_VERSION = 'v19.0';

export const WhatsAppService = {
    /**
     * Upload Media Securely to Meta's Server to get a Media ID for broadcasts
     */
    async uploadMediaToMeta(fileBuffer: Buffer, filename: string, mimeType: string, waPhoneNumberId?: string, waToken?: string) {
        try {
            const phoneId = waPhoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;
            const token = waToken || process.env.META_WA_TOKEN;

            if (!phoneId || !token) {
                throw new Error("Meta WhatsApp Credentials are not configured for this company.");
            }

            const url = `https://graph.facebook.com/${META_API_VERSION}/${phoneId}/media`;
            
            const formData = new FormData();
            formData.append('messaging_product', 'whatsapp');
            formData.append('file', fileBuffer, { filename, contentType: mimeType });

            const response = await axios.post(url, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.data.id; // The Meta MEDIA_ID
        } catch (error: any) {
            console.error("Meta Media Upload Error:", error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || "Failed to upload media to Meta");
        }
    },

    /**
     * Fetch approved templates directly from Meta using the WABA ID
     */
    async getApprovedTemplates(waBusinessAccountId: string, waToken: string) {
        try {
            if (!waBusinessAccountId || !waToken) {
                throw new Error("Missing Meta WABA ID or Token");
            }
            const url = `https://graph.facebook.com/${META_API_VERSION}/${waBusinessAccountId}/message_templates`;
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${waToken}`
                }
            });
            // Meta returns templates in 'data' array. Filter to approved ones.
            return (response.data?.data || []).filter((t: any) => t.status === 'APPROVED');
        } catch (error: any) {
            console.error("Meta WhatsApp Template Fetch Error:", error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || "Failed to fetch Meta templates");
        }
    },

    /**
     * Sends a simple freeform text message.
     * Note: This only succeeds if there is an open 24-hr customer service window.
     */
    async sendText(to: string, message: string, waPhoneNumberId?: string, waToken?: string) {
        try {
            const phoneId = waPhoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;
            const token = waToken || process.env.META_WA_TOKEN;

            if (!phoneId || !token) {
                 throw new Error("Meta WhatsApp Credentials are not configured for this company.");
            }

            // Meta requires international format without +
            let formattedPhone = to.replace(/\D/g, '');
            if (formattedPhone.startsWith('0') && formattedPhone.length === 11) {
                formattedPhone = '234' + formattedPhone.slice(1);
            } else if (formattedPhone.startsWith('2340') && formattedPhone.length === 14) {
                formattedPhone = '234' + formattedPhone.slice(4);
            }

            const url = `https://graph.facebook.com/${META_API_VERSION}/${phoneId}/messages`;
            
            const payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: formattedPhone,
                type: "text",
                text: { 
                    preview_url: false,
                    body: message 
                }
            };

            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`[WHATSAPP SENT] To: ${to}, Message ID: ${response.data.messages?.[0]?.id}`);
            return response.data.messages?.[0]?.id || 'meta-wa-id';
        } catch (error: any) {
            console.error("Meta WhatsApp Text Error:", error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || "Failed to send Meta WhatsApp text");
        }
    },

    /**
     * Sends a rich media attachment (Image, Video, or Document)
     * Note: This also requires an open 24-hr customer service window unless part of a template.
     */
    async sendMedia(to: string, mediaUrl: string, mediaType: 'image' | 'video' | 'document', waPhoneNumberId?: string, waToken?: string) {
        try {
            const phoneId = waPhoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;
            const token = waToken || process.env.META_WA_TOKEN;

            if (!phoneId || !token) {
                 throw new Error("Meta WhatsApp Credentials are not configured for this company.");
            }

            let formattedPhone = to.replace(/\D/g, '');
            if (formattedPhone.startsWith('0') && formattedPhone.length === 11) {
                formattedPhone = '234' + formattedPhone.slice(1);
            } else if (formattedPhone.startsWith('2340') && formattedPhone.length === 14) {
                formattedPhone = '234' + formattedPhone.slice(4);
            }

            const url = `https://graph.facebook.com/${META_API_VERSION}/${phoneId}/messages`;
            
            const payload: any = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: formattedPhone,
                type: mediaType
            };
            
            payload[mediaType] = { link: mediaUrl };

            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`[WHATSAPP MEDIA SENT] To: ${to}, Message ID: ${response.data.messages?.[0]?.id}`);
            return response.data.messages?.[0]?.id || 'meta-wa-id';
        } catch (error: any) {
            console.error("Meta WhatsApp Media Error:", error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || "Failed to send Meta WhatsApp media");
        }
    },

    /**
     * Sends an approved template message. Required for initiating contact (Marketing campaigns).
     * Now supports optional media attachments!
     */
    async sendTemplate(to: string, templateName: string, languageCode: string = 'en', waPhoneNumberId?: string, waToken?: string, mediaId?: string, mediaType?: 'image' | 'video' | 'document') {
        try {
            const phoneId = waPhoneNumberId || process.env.META_WA_PHONE_NUMBER_ID;
            const token = waToken || process.env.META_WA_TOKEN;

             if (!phoneId || !token) {
                 throw new Error("Meta WhatsApp Credentials are not configured for this company.");
            }

            let formattedPhone = to.replace(/\D/g, '');
            if (formattedPhone.startsWith('0') && formattedPhone.length === 11) {
                formattedPhone = '234' + formattedPhone.slice(1);
            }

            const url = `https://graph.facebook.com/${META_API_VERSION}/${phoneId}/messages`;
            
            const payload: any = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: formattedPhone,
                type: "template",
                template: {
                    name: templateName,
                    language: {
                        code: languageCode
                    }
                }
            };

            // Inject Media components if present!
            if (mediaId && mediaType) {
                payload.template.components = [
                    {
                        type: "header",
                        parameters: [
                            {
                                type: mediaType,
                                [mediaType]: {
                                    id: mediaId
                                }
                            }
                        ]
                    }
                ];
            }

            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`[WHATSAPP TEMPLATE SENT] To: ${to}, Message ID: ${response.data.messages?.[0]?.id}`);
            return response.data.messages?.[0]?.id || 'meta-wa-id';
        } catch (error: any) {
            console.error("Meta WhatsApp Template Error:", error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || "Failed to send Meta WhatsApp template");
        }
    }
};
