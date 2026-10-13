/**
 * Normalizes phone numbers to standard canonical format.
 * Nigerian numbers:
 * - 07045763306 -> 2347045763306
 * - +2347045763306 -> 2347045763306
 * - 7045763306 -> 2347045763306
 * - 2347045763306 -> 2347045763306
 */
export function normalizePhoneNumber(rawPhone: string | number | null | undefined): string {
    if (!rawPhone) return '';
    let phone = String(rawPhone).trim();
    // Remove spaces, hyphens, brackets, dots, plus signs
    phone = phone.replace(/[^0-9]/g, '');

    if (!phone) return '';

    // Handle Nigerian 11-digit local format: 080..., 070..., 090..., 081...
    if (phone.startsWith('0') && phone.length === 11) {
        phone = '234' + phone.substring(1);
    } else if (phone.length === 10 && (phone.startsWith('7') || phone.startsWith('8') || phone.startsWith('9'))) {
        phone = '234' + phone;
    }

    return phone;
}

export function formatPhoneDisplay(phone: string): string {
    if (!phone) return '-';
    if (phone.startsWith('234') && phone.length === 13) {
        // Format as +234 704 576 3306
        return `+234 ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
    }
    return phone;
}
