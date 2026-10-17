export interface Contact {
    id: string;
    name: string;
    phone: string;
    email: string;
    site: string;
    gender: string;
    title?: string;
    tags?: string[];
    // Smart addressing & spreadsheet enrichment
    phones?: string[];
    firstName?: string;
    salutation?: string;
    plotNumber?: string;
    houseType?: string;
    plotSize?: string;
    address?: string;
    isCorporate?: boolean;
    isCouple?: boolean;
    isJoint?: boolean;
}

export interface BroadcastContact {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    site?: string | null;
    gender?: string | null;
    title?: string | null;
    tags: string[];
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface BroadcastCampaign {
    id: string;
    title: string;
    channel: 'SMS' | 'EMAIL';
    senderId: string;
    subject?: string | null;
    messageTemplate: string;
    totalRecipients: number;
    successCount: number;
    failedCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface BroadcastRecipientLog {
    id: string;
    campaignId: string;
    contactId?: string | null;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    status: 'SUCCESS' | 'FAILED';
    failureReason?: string | null;
    sentAt: string;
}

export interface LiveLogEntry {
    id: string;
    contact: Contact;
    status: 'Success' | 'Failed' | 'Pending';
    reason?: string;
}
