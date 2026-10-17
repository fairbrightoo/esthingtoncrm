/**
 * Phone Number Utilities for Bulk Messaging
 * 
 * Supports:
 * - Splitting multi-number cells (e.g. '7031385116/8028171412', '0803... , 0812...')
 * - Normalizing Nigerian 10-digit, 11-digit, and 13-digit numbers to Termii's 234... standard
 * - Detecting & preserving international numbers (e.g. US +1 346 702 5993 as '13467025993')
 */

/**
 * Splits a phone string by common delimiters: /, comma, semicolon, &, pipe, newline
 */
export function splitPhoneNumbers(raw: string | number | null | undefined): string[] {
    if (!raw) return [];
    const str = String(raw).trim();
    if (!str) return [];

    return str
        .split(/[/,;&|\n]+/)
        .map(p => p.trim())
        .filter(p => p.length >= 7);
}

/**
 * Normalizes a single phone number into canonical international digits (no + symbol).
 */
export function normalizeSinglePhoneNumber(rawPhone: string | number | null | undefined): string {
    if (!rawPhone) return '';
    let phone = String(rawPhone).trim();
    // Strip non-digits
    phone = phone.replace(/[^0-9]/g, '');
    if (!phone) return '';

    // 1. Nigerian 14-digit typo: +234 080... -> '234080...'
    if (phone.startsWith('2340') && phone.length === 14) {
        return '234' + phone.substring(4);
    }

    // 2. Nigerian 13-digit canonical: '234803...'
    if (phone.startsWith('234') && phone.length === 13) {
        return phone;
    }

    // 3. Nigerian 11-digit local: '07045763306', '08057709000', '090...', '081...'
    if (phone.startsWith('0') && phone.length === 11) {
        return '234' + phone.substring(1);
    }

    // 4. Nigerian 10-digit missing leading zero: '7061610101', '8057709000', '901...'
    if (phone.length === 10 && (phone.startsWith('7') || phone.startsWith('8') || phone.startsWith('9'))) {
        return '234' + phone;
    }

    // 5. North American (US/Canada NANP) 11 digits: '13467025993', '12407054527'
    if (phone.length === 11 && phone.startsWith('1')) {
        return phone; // Keep intact as +1 international for Termii
    }

    // 6. North American 10 digits without leading 1 (e.g. '3467025993' not starting with 7,8,9)
    if (phone.length === 10 && !['7', '8', '9'].includes(phone.charAt(0))) {
        return '1' + phone;
    }

    // 7. UK numbers (starts with 44 and 12-13 digits)
    if (phone.startsWith('44') && phone.length >= 11 && phone.length <= 13) {
        return phone;
    }

    // Default fallback: return digits if valid length
    if (phone.length >= 8) {
        return phone;
    }

    return '';
}

/**
 * Splits and normalizes multiple numbers from a single cell.
 */
export function splitAndNormalizePhones(rawPhone: string | number | null | undefined): string[] {
    const parts = splitPhoneNumbers(rawPhone);
    const normalizedList: string[] = [];
    const seen = new Set<string>();

    for (const part of parts) {
        const norm = normalizeSinglePhoneNumber(part);
        if (norm && !seen.has(norm)) {
            seen.add(norm);
            normalizedList.push(norm);
        }
    }

    return normalizedList;
}

/**
 * Normalizes phone number, returning the primary number if multiple exist.
 */
export function normalizePhoneNumber(rawPhone: string | number | null | undefined): string {
    const phones = splitAndNormalizePhones(rawPhone);
    return phones.length > 0 ? phones[0] : normalizeSinglePhoneNumber(rawPhone);
}

/**
 * Formats a phone number for elegant human-readable display.
 */
export function formatPhoneDisplay(phone: string): string {
    if (!phone) return '-';

    // Nigerian standard +234
    if (phone.startsWith('234') && phone.length === 13) {
        return `+234 ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
    }

    // US / Canada +1
    if (phone.startsWith('1') && phone.length === 11) {
        return `+1 (${phone.slice(1, 4)}) ${phone.slice(4, 7)}-${phone.slice(7)}`;
    }

    // UK +44
    if (phone.startsWith('44') && phone.length >= 12) {
        return `+44 ${phone.slice(2, 6)} ${phone.slice(6)}`;
    }

    return `+${phone}`;
}
