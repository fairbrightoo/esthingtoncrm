/**
 * Normalizes phone numbers to standard canonical format.
 * Specifically handles Nigerian phone numbers:
 * - '07045763306' -> '2347045763306'
 * - '+234 704 576 3306' -> '2347045763306'
 * - '7045763306' -> '2347045763306'
 * - '2347045763306' -> '2347045763306'
 * Also handles international numbers by retaining country digits.
 */
export function normalizePhoneNumber(rawPhone: string | number | null | undefined): string {
    if (!rawPhone) return '';
    let phone = String(rawPhone).trim();
    // Remove all spaces, dashes, dots, plus signs, brackets
    phone = phone.replace(/[^0-9]/g, '');

    if (!phone) return '';

    // If starts with 0 and 11 digits long (e.g. 080..., 070..., 090..., 081...)
    if (phone.startsWith('0') && phone.length === 11) {
        phone = '234' + phone.substring(1);
    } else if (phone.length === 10 && (phone.startsWith('7') || phone.startsWith('8') || phone.startsWith('9'))) {
        phone = '234' + phone;
    }

    return phone;
}
