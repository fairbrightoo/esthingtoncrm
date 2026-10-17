import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { splitAndNormalizePhones, normalizePhoneNumber } from './phoneUtils';
import { parseSmartAddressing, toTitleCase } from './smartAddressing';
import type { Contact } from './types';

export interface ParseResult {
    contacts: Contact[];
    filename: string;
    totalCount: number;
    validPhoneCount: number;
    totalPhoneLines: number;
    detectedSite: string;
}

/**
 * Searches for a cell value matching any of the candidate keys (case-insensitive)
 */
function findValueInRow(row: Record<string, any>, keys: string[]): string {
    const rowKeys = Object.keys(row);
    for (const target of keys) {
        // Direct match
        if (row[target] !== undefined && row[target] !== null && String(row[target]).trim() !== '') {
            return String(row[target]).trim();
        }
        // Case-insensitive match
        const matched = rowKeys.find(rk => rk.trim().toLowerCase() === target.toLowerCase());
        if (matched && row[matched] !== undefined && row[matched] !== null) {
            const val = String(row[matched]).trim();
            if (val !== '') return val;
        }
    }
    return '';
}

/**
 * Maps a single row object to an enriched Contact with smart addressing and multi-phone resolution
 */
function mapRowToContact(row: Record<string, any>, index: number, detectedSite: string): Contact {
    const rawName = findValueInRow(row, [
        'Client Name', 'Name', 'Full Name', 'Customer', 'Subscriber', 'Client', 'Contact Name'
    ]);
    const rawPhone = findValueInRow(row, [
        'Phone No.', 'Phone No', 'Phone', 'Phone Number', 'Mobile', 'Contact', 'GSM', 'Tel', 'Telephone'
    ]);
    const email = findValueInRow(row, ['Email Address', 'Email', 'E-mail', 'Mail']);
    const explicitSite = findValueInRow(row, ['Site', 'Site Subscribed', 'Property', 'Estate', 'Project', 'Location']);
    const explicitGender = findValueInRow(row, ['Gender', 'Sex']);
    const explicitTitle = findValueInRow(row, ['Title', 'Honorific']);
    const plotNumber = findValueInRow(row, ['Plot No.', 'Plot No', 'Plot Number', 'Plot', 'Unit No']);
    const houseType = findValueInRow(row, ['House Type', 'Building Type', 'Type', 'Description']);
    const plotSize = findValueInRow(row, ['Plot Size', 'Size']);
    const address = findValueInRow(row, ['Residential Address', 'Address', 'Contact Address', 'Location Address']);

    // Run smart addressing engine
    const addressing = parseSmartAddressing(rawName);

    // Run multi-phone normalizer
    const parsedPhones = splitAndNormalizePhones(rawPhone);
    const primaryPhone = parsedPhones.length > 0 ? parsedPhones[0] : normalizePhoneNumber(rawPhone);

    const site = explicitSite || detectedSite || '';
    const gender = explicitGender || addressing.gender || '';
    const title = explicitTitle || addressing.title || (gender === 'Female' ? "Ma'am" : (gender === 'Male' ? "Sir" : ''));

    return {
        id: `row-${index}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: addressing.cleanName,
        phone: primaryPhone,
        phones: parsedPhones,
        email: email || '',
        site,
        gender,
        title,
        firstName: addressing.firstName,
        salutation: addressing.salutation,
        plotNumber: plotNumber ? plotNumber.toUpperCase() : '',
        houseType: houseType ? toTitleCase(houseType) : '',
        plotSize: plotSize ? plotSize.toLowerCase() : '',
        address: address ? toTitleCase(address) : '',
        isCorporate: addressing.isCorporate,
        isCouple: addressing.isCouple,
        isJoint: addressing.isJoint
    };
}

/**
 * Inspects raw worksheet rows to find top estate banners (e.g., 'DOUBLE KING VILLA GUZAPE 2 CLUSTER A')
 * and locates the actual table header row index.
 */
function extractBannerAndHeader(matrix: any[][]): { banner: string; headerRowIndex: number; headers: string[] } {
    let banner = '';
    let headerRowIndex = 0;

    const HEADER_KEYWORDS = ['client name', 'name', 'phone no', 'phone', 'plot no', 'email'];

    // Scan top 6 rows
    for (let r = 0; r < Math.min(matrix.length, 6); r++) {
        const row = matrix[r] || [];
        const textCells = row.map(c => String(c || '').trim()).filter(Boolean);

        // Check if this row looks like the table headers
        const matchesKeyword = textCells.filter(cell => 
            HEADER_KEYWORDS.some(k => cell.toLowerCase().includes(k))
        );

        if (matchesKeyword.length >= 2) {
            headerRowIndex = r;
            break;
        }

        // If row has 1 or 2 large text strings before headers, it's likely the estate banner!
        if (textCells.length > 0 && textCells.length <= 3 && !banner) {
            const candidate = textCells.join(' ').trim();
            // Check if looks like estate name
            if (candidate.length >= 5 && !candidate.toLowerCase().startsWith('s/n')) {
                banner = toTitleCase(candidate);
            }
        }
    }

    const headers = (matrix[headerRowIndex] || []).map(c => String(c || '').trim());
    return { banner, headerRowIndex, headers };
}

/**
 * Universal spreadsheet parser for .xlsx, .xls, and .csv
 */
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
                    const worksheet = workbook.Sheets[firstSheetName];

                    // Convert to raw matrix (array of arrays)
                    const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                    if (!matrix || matrix.length === 0) {
                        return reject(new Error("The selected sheet contains no data rows."));
                    }

                    const { banner, headerRowIndex, headers } = extractBannerAndHeader(matrix);

                    // If banner wasn't in top rows, check worksheet name
                    const detectedSite = banner || (firstSheetName.toLowerCase().startsWith('sheet') ? '' : toTitleCase(firstSheetName));

                    // Convert matrix rows below headerRowIndex into key-value objects
                    const contacts: Contact[] = [];
                    for (let r = headerRowIndex + 1; r < matrix.length; r++) {
                        const rowArr = matrix[r];
                        if (!rowArr || rowArr.length === 0) continue;

                        const rowObj: Record<string, any> = {};
                        let hasData = false;
                        headers.forEach((h, colIdx) => {
                            if (h && rowArr[colIdx] !== undefined) {
                                rowObj[h] = rowArr[colIdx];
                                if (String(rowArr[colIdx]).trim() !== '') hasData = true;
                            }
                        });

                        if (hasData) {
                            contacts.push(mapRowToContact(rowObj, contacts.length, detectedSite));
                        }
                    }

                    const validPhoneCount = contacts.filter(c => c.phone && c.phone.length >= 10).length;
                    const totalPhoneLines = contacts.reduce((sum, c) => sum + (c.phones?.length || (c.phone ? 1 : 0)), 0);

                    resolve({
                        contacts,
                        filename: file.name,
                        totalCount: contacts.length,
                        validPhoneCount,
                        totalPhoneLines,
                        detectedSite
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
                skipEmptyLines: true,
                complete: (results) => {
                    try {
                        const matrix = results.data as any[][];
                        if (!matrix || matrix.length === 0) {
                            return reject(new Error("The CSV file contains no data rows."));
                        }

                        const { banner, headerRowIndex, headers } = extractBannerAndHeader(matrix);
                        const detectedSite = banner;

                        const contacts: Contact[] = [];
                        for (let r = headerRowIndex + 1; r < matrix.length; r++) {
                            const rowArr = matrix[r];
                            if (!rowArr || rowArr.length === 0) continue;

                            const rowObj: Record<string, any> = {};
                            let hasData = false;
                            headers.forEach((h, colIdx) => {
                                if (h && rowArr[colIdx] !== undefined) {
                                    rowObj[h] = rowArr[colIdx];
                                    if (String(rowArr[colIdx]).trim() !== '') hasData = true;
                                }
                            });

                            if (hasData) {
                                contacts.push(mapRowToContact(rowObj, contacts.length, detectedSite));
                            }
                        }

                        const validPhoneCount = contacts.filter(c => c.phone && c.phone.length >= 10).length;
                        const totalPhoneLines = contacts.reduce((sum, c) => sum + (c.phones?.length || (c.phone ? 1 : 0)), 0);

                        resolve({
                            contacts,
                            filename: file.name,
                            totalCount: contacts.length,
                            validPhoneCount,
                            totalPhoneLines,
                            detectedSite
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
