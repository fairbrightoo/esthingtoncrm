import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { normalizePhoneNumber } from '../utils/phoneNormalizer.js';

export const BroadcastContactController = {
    // List contacts with search, pagination, and tag/site filtering
    async getContacts(req: Request, res: Response) {
        try {
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
            const search = (req.query.search as string || '').trim();
            const tag = (req.query.tag as string || '').trim();
            const site = (req.query.site as string || '').trim();

            const where: any = {};

            if (search) {
                const normalizedSearchPhone = search.replace(/[^0-9]/g, '');
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { site: { contains: search, mode: 'insensitive' } },
                    ...(normalizedSearchPhone ? [{ phone: { contains: normalizedSearchPhone } }] : [])
                ];
            }

            if (tag) {
                where.tags = { has: tag };
            }

            if (site) {
                where.site = { equals: site, mode: 'insensitive' };
            }

            const [total, contacts] = await Promise.all([
                prisma.broadcastContact.count({ where }),
                prisma.broadcastContact.findMany({
                    where,
                    skip: (page - 1) * limit,
                    take: limit,
                    orderBy: { updatedAt: 'desc' }
                })
            ]);

            res.json({
                contacts,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            });
        } catch (error: any) {
            console.error("Error fetching broadcast contacts:", error);
            res.status(500).json({ error: error.message || "Failed to fetch contacts" });
        }
    },

    // Get all contacts or filtered by tag/site for audience composer picker (lean payload)
    async getAudienceContacts(req: Request, res: Response) {
        try {
            const tag = (req.query.tag as string || '').trim();
            const site = (req.query.site as string || '').trim();
            const where: any = {};

            if (tag) where.tags = { has: tag };
            if (site) where.site = { equals: site, mode: 'insensitive' };

            const contacts = await prisma.broadcastContact.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                    site: true,
                    gender: true,
                    title: true,
                    tags: true
                },
                orderBy: { name: 'asc' }
            });

            res.json({ contacts, total: contacts.length });
        } catch (error: any) {
            console.error("Error fetching audience contacts:", error);
            res.status(500).json({ error: "Failed to fetch audience contacts" });
        }
    },

    // Manually create a new contact
    async createContact(req: Request, res: Response) {
        try {
            const { name, phone, email, site, gender, title, tags, notes } = req.body;

            if (!name || !phone) {
                return res.status(400).json({ error: "Full Name and Phone Number are required" });
            }

            const normalizedPhone = normalizePhoneNumber(phone);
            if (!normalizedPhone) {
                return res.status(400).json({ error: "Invalid phone number format" });
            }

            const existing = await prisma.broadcastContact.findUnique({
                where: { phone: normalizedPhone }
            });

            if (existing) {
                return res.status(400).json({
                    error: `A contact with phone ${normalizedPhone} already exists (${existing.name}).`
                });
            }

            const cleanTags = Array.isArray(tags) 
                ? tags.map(t => String(t).trim()).filter(Boolean)
                : (typeof tags === 'string' && tags.trim() ? [tags.trim()] : []);

            const contact = await prisma.broadcastContact.create({
                data: {
                    name: name.trim(),
                    phone: normalizedPhone,
                    email: email?.trim() || null,
                    site: site?.trim() || null,
                    gender: gender?.trim() || null,
                    title: title?.trim() || null,
                    tags: cleanTags,
                    notes: notes?.trim() || null
                }
            });

            res.status(201).json({ success: true, contact });
        } catch (error: any) {
            console.error("Error creating broadcast contact:", error);
            res.status(500).json({ error: error.message || "Failed to create contact" });
        }
    },

    // Update an existing contact
    async updateContact(req: Request, res: Response) {
        try {
            const id = String(req.params.id);
            const { name, phone, email, site, gender, title, tags, notes } = req.body;

            const existing = await prisma.broadcastContact.findUnique({ where: { id } });
            if (!existing) {
                return res.status(404).json({ error: "Contact not found" });
            }

            let normalizedPhone = existing.phone;
            if (phone) {
                normalizedPhone = normalizePhoneNumber(phone);
                if (normalizedPhone !== existing.phone) {
                    const phoneConflict = await prisma.broadcastContact.findUnique({
                        where: { phone: normalizedPhone }
                    });
                    if (phoneConflict) {
                        return res.status(400).json({
                            error: `Phone ${normalizedPhone} is already in use by ${phoneConflict.name}`
                        });
                    }
                }
            }

            const cleanTags = Array.isArray(tags) 
                ? tags.map(t => String(t).trim()).filter(Boolean)
                : (typeof tags === 'string' && tags.trim() ? [tags.trim()] : existing.tags);

            const updated = await prisma.broadcastContact.update({
                where: { id },
                data: {
                    name: name !== undefined ? name.trim() : existing.name,
                    phone: normalizedPhone,
                    email: email !== undefined ? (email?.trim() || null) : existing.email,
                    site: site !== undefined ? (site?.trim() || null) : existing.site,
                    gender: gender !== undefined ? (gender?.trim() || null) : existing.gender,
                    title: title !== undefined ? (title?.trim() || null) : existing.title,
                    tags: cleanTags,
                    notes: notes !== undefined ? (notes?.trim() || null) : existing.notes
                }
            });

            res.json({ success: true, contact: updated });
        } catch (error: any) {
            console.error("Error updating broadcast contact:", error);
            res.status(500).json({ error: error.message || "Failed to update contact" });
        }
    },

    // Delete a contact
    async deleteContact(req: Request, res: Response) {
        try {
            const id = String(req.params.id);
            await prisma.broadcastContact.delete({ where: { id } });
            res.json({ success: true, message: "Contact deleted successfully" });
        } catch (error: any) {
            console.error("Error deleting broadcast contact:", error);
            res.status(500).json({ error: "Failed to delete contact" });
        }
    },

    // Smart Sync/Ingest Contacts from Spreadsheet (Upsert without duplicates)
    async syncContacts(req: Request, res: Response) {
        try {
            const { contacts, tag } = req.body;
            if (!contacts || !Array.isArray(contacts)) {
                return res.status(400).json({ error: "Invalid contacts payload" });
            }

            const cleanTag = tag ? String(tag).trim() : null;
            let addedCount = 0;
            let updatedCount = 0;
            let skippedCount = 0;

            // Normalize and collect unique contacts within the spreadsheet payload itself
            const normalizedMap = new Map<string, any>();

            for (const c of contacts) {
                const normPhone = normalizePhoneNumber(c.phone);
                if (!normPhone) {
                    skippedCount++;
                    continue;
                }

                // If already seen in this file, merge missing fields
                if (normalizedMap.has(normPhone)) {
                    const existingInFile = normalizedMap.get(normPhone);
                    if (!existingInFile.name && c.name) existingInFile.name = c.name;
                    if (!existingInFile.email && c.email) existingInFile.email = c.email;
                    if (!existingInFile.site && c.site) existingInFile.site = c.site;
                    if (!existingInFile.gender && c.gender) existingInFile.gender = c.gender;
                } else {
                    normalizedMap.set(normPhone, {
                        name: c.name?.trim() || 'Valued Subscriber',
                        phone: normPhone,
                        email: c.email?.trim() || null,
                        site: c.site?.trim() || null,
                        gender: c.gender?.trim() || null,
                        title: c.title?.trim() || (c.gender === 'Female' ? "Ma'am" : 'Sir'),
                        tags: cleanTag ? [cleanTag] : []
                    });
                }
            }

            const uniquePhones = Array.from(normalizedMap.keys());

            // Fetch existing contacts from DB in chunks of 500
            const existingContacts = await prisma.broadcastContact.findMany({
                where: { phone: { in: uniquePhones } },
                select: { id: true, phone: true, name: true, email: true, site: true, gender: true, tags: true }
            });

            const existingMap = new Map<string, any>();
            existingContacts.forEach(ec => existingMap.set(ec.phone, ec));

            const toCreate: any[] = [];
            const toUpdate: { id: string; data: any }[] = [];

            for (const [phone, item] of normalizedMap.entries()) {
                const existing = existingMap.get(phone);
                if (existing) {
                    // Update missing fields and append tag if new
                    const updateData: any = {};
                    let hasChanges = false;

                    if (!existing.email && item.email) {
                        updateData.email = item.email;
                        hasChanges = true;
                    }
                    if (!existing.site && item.site) {
                        updateData.site = item.site;
                        hasChanges = true;
                    }
                    if (!existing.gender && item.gender) {
                        updateData.gender = item.gender;
                        hasChanges = true;
                    }
                    if (cleanTag && !existing.tags.includes(cleanTag)) {
                        updateData.tags = [...existing.tags, cleanTag];
                        hasChanges = true;
                    }

                    if (hasChanges) {
                        toUpdate.push({ id: existing.id, data: updateData });
                    }
                } else {
                    toCreate.push(item);
                }
            }

            // Perform batch creations
            if (toCreate.length > 0) {
                // Prisma createMany is supported on Postgres
                await prisma.broadcastContact.createMany({
                    data: toCreate,
                    skipDuplicates: true
                });
                addedCount = toCreate.length;
            }

            // Perform individual updates
            for (const upd of toUpdate) {
                await prisma.broadcastContact.update({
                    where: { id: upd.id },
                    data: upd.data
                });
                updatedCount++;
            }

            res.json({
                success: true,
                summary: {
                    totalParsed: contacts.length,
                    uniqueProcessed: normalizedMap.size,
                    addedCount,
                    updatedCount,
                    skippedCount
                }
            });
        } catch (error: any) {
            console.error("Error syncing contacts:", error);
            res.status(500).json({ error: error.message || "Failed to sync contacts" });
        }
    },

    // Get metadata (distinct tags and sites) for quick filtering
    async getFiltersMeta(req: Request, res: Response) {
        try {
            const allContacts = await prisma.broadcastContact.findMany({
                select: { tags: true, site: true }
            });

            const tagsSet = new Set<string>();
            const sitesSet = new Set<string>();

            for (const c of allContacts) {
                if (c.site) sitesSet.add(c.site);
                if (Array.isArray(c.tags)) {
                    c.tags.forEach(t => tagsSet.add(t));
                }
            }

            res.json({
                tags: Array.from(tagsSet).sort(),
                sites: Array.from(sitesSet).sort(),
                totalContacts: allContacts.length
            });
        } catch (error: any) {
            console.error("Error fetching filters metadata:", error);
            res.status(500).json({ error: "Failed to fetch filters" });
        }
    }
};
