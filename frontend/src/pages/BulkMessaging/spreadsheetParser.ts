import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { normalizePhoneNumber } from './phoneUtils';
import type { Contact } from './types';

export interface ParseResult {
    contacts: Contact[];
    filename: string;
    totalCount: number;
    validPhoneCount: number;
}

function mapRowToContact(row: any, index: number): Contact {
    // Flexible header extraction (case-insensitive fallback)
    const findValue = (keys: string[]): string => {
        for (const k of keys) {
            if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
                return String(row[k]).trim();
            }
        }
        // Case-insensitive check
        const rowKeys = Object.keys(row);
        for (const target of keys) {
            const matchedKey = rowKeys.find(rk => rk.trim().toLowerCase() === target.toLowerCase());
            if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
                const val = String(row[matchedKey]).trim();
                if (val !== '') return val;
            }
        }
        return '';
    };

    const name = findValue(['Name', 'Full Name', 'Client Name', 'Customer', 'Subscriber', 'Client', 'Contact Name']);
    const rawPhone = findValue(['Phone', 'Phone Number', 'Mobile', 'Contact', 'GSM', 'Tel', 'Telephone', 'Phone No']);
    const email = findValue(['Email', 'Email Address', 'E-mail', 'Mail']);
    const site = findValue(['Site', 'Site Subscribed', 'Property', 'Estate', 'Project', 'Location']);
    const gender = findValue(['Gender', 'Sex']);
    const title = findValue(['Title', 'Honorific']);

    const normalizedPhone = normalizePhoneNumber(rawPhone);

    return {
        id: `row-${index}-${Date.now()}`,
        name: name || 'Valued Subscriber',
        phone: normalizedPhone || rawPhone,
        email: email || '',
        site: site || '',
        gender: gender || '',
        title: title || (gender === 'Female' ? "Ma'am" : 'Sir')
    };
}

export function parseSpreadsheetFile(file: File): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

        if (isExcel) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    if (workbook.SheetNames.length === 0) {
                        return reject(new Error("The Excel workbook contains no sheets."));
                    }

                    const firstSheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[firstSheetName];
                    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

                    if (!rawRows || rawRows.length === 0) {
                        return reject(new Error("The selected sheet contains no rows."));
                    }

                    const contacts: Contact[] = rawRows.map((row, idx) => mapRowToContact(row, idx));
                    const validPhoneCount = contacts.filter(c => c.phone && c.phone.length >= 10).length;

                    resolve({
                        contacts,
                        filename: file.name,
                        totalCount: contacts.length,
                        validPhoneCount
                    });
                } catch (err: any) {
                    reject(new Error(`Failed to parse Excel file: ${err.message}`));
                }
            };
            reader.onerror = () => reject(new Error("Failed to read Excel file."));
            reader.readAsArrayBuffer(file);
        } else {
            // CSV parsing via PapaParse
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    try {
                        const rawRows = results.data as any[];
                        if (!rawRows || rawRows.length === 0) {
                            return reject(new Error("The CSV file contains no data rows."));
                        }

                        const contacts: Contact[] = rawRows.map((row, idx) => mapRowToContact(row, idx));
                        const validPhoneCount = contacts.filter(c => c.phone && c.phone.length >= 10).length;

                        resolve({
                            contacts,
                            filename: file.name,
                            totalCount: contacts.length,
                            validPhoneCount
                        });
                    } catch (err: any) {
                        reject(new Error(`Failed to process CSV rows: ${err.message}`));
                    }
                },
                error: (error) => reject(new Error(`CSV parsing error: ${error.message}`))
            });
        }
    });
}
