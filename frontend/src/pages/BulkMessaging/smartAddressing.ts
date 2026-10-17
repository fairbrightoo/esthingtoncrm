/**
 * Smart Addressing & Name Resolution Engine
 * Handles real-world estate spreadsheet variations:
 * 1. Couples & Spouses (e.g., 'MR & MRS ABRAHAM SALAWU')
 * 2. Joint Subscribers (e.g., 'James Obaji & Olabisi Obaji')
 * 3. Corporate Entities (e.g., 'EAZZYHOLDING LIMITED')
 * 4. Professional & Cultural Titles (e.g., 'ENGR. JOHNLOUIS CHIKA UZOERI')
 * 5. Standard Individuals with or without prefixes (e.g., 'MRS BLESSING U. GODFREY', 'IDRIS TITUS KAYODE')
 */

export interface ParsedAddressing {
    cleanName: string;
    firstName: string;
    salutation: string;
    title: string;
    gender: 'Male' | 'Female' | 'Joint' | 'Corporate' | '';
    isCorporate: boolean;
    isCouple: boolean;
    isJoint: boolean;
}

// Common female Nigerian/English names for safe gender deduction
const KNOWN_FEMALE_NAMES = new Set([
    'blessing', 'chiamaka', 'mercy', 'grace', 'fatima', 'aisha', 'ngozi',
    'chioma', 'mary', 'esther', 'favour', 'bisola', 'feyisayo', 'fancisca',
    'francisca', 'bridget', 'chinenye', 'joy', 'faith', 'peace', 'oluwaseun',
    'tolu', 'zainab', 'aminat', 'halima', 'funke', 'boma', 'valentina', 'estella'
]);

// Common male Nigerian/English names for safe gender deduction
const KNOWN_MALE_NAMES = new Set([
    'idris', 'titus', 'kayode', 'rotji', 'raymond', 'gideon', 'ohegbe',
    'augustine', 'emmanuel', 'adamu', 'mukhtar', 'isa', 'abraham', 'salawu',
    'chidi', 'chidiubele', 'bernard', 'ikenna', 'rapheal', 'kingsley', 'ekene',
    'johnlouis', 'chika', 'uzoeri', 'uka', 'muhammed', 'ibrahim', 'luka',
    'yohanna', 'olatunji', 'femi', 'babajide', 'ahmed', 'musa', 'usman'
]);

// Corporate keywords
const CORPORATE_REGEX = /\b(LIMITED|LTD|PLC|VENTURES|HOLDINGS|ENTERPRISES|ENTERPRISE|CORP|CORPORATION|COMPANY|CO\.|PROPERTIES|SERVICES|GLOBAL|INVESTMENTS|CONSULT|CONSULTING|GROUP)\b/i;

// Professional / Cultural title prefixes
const TITLE_PREFIXES = [
    { match: /^(ENGR\.?|ENGINEER)\s+/i, title: 'Engr.', gender: '' },
    { match: /^(DR\.?|DOCTOR)\s+/i, title: 'Dr.', gender: '' },
    { match: /^(BARR\.?|BARRISTER)\s+/i, title: 'Barr.', gender: '' },
    { match: /^(ARC\.?|ARCH\.?|ARCHITECT)\s+/i, title: 'Arc.', gender: '' },
    { match: /^(PROF\.?|PROFESSOR)\s+/i, title: 'Prof.', gender: '' },
    { match: /^(CHIEF)\s+/i, title: 'Chief', gender: '' },
    { match: /^(PASTOR|PST\.?)\s+/i, title: 'Pastor', gender: '' },
    { match: /^(ALHAJI|ALH\.?)\s+/i, title: 'Alhaji', gender: 'Male' },
    { match: /^(HAJIYA|HAJ\.?)\s+/i, title: 'Hajiya', gender: 'Female' },
    { match: /^(REV\.?|REVEREND)\s+/i, title: 'Rev.', gender: '' },
    { match: /^(SEN\.?|SENATOR)\s+/i, title: 'Senator', gender: '' },
    { match: /^(HON\.?|HONOURABLE)\s+/i, title: 'Hon.', gender: '' }
];

/**
 * Standardizes string into clean Title Case while preserving intentional casing
 */
export function toTitleCase(str: string): string {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .filter(Boolean)
        .map(word => {
            // Keep special symbols or initials like U. or A.
            if (/^[a-z]\.?$/i.test(word)) return word.toUpperCase();
            // Preserve acronyms & known tokens
            if (['ltd', 'plc', 'usa', 'uk', 'fct', 'bq'].includes(word.toLowerCase())) {
                return word.toUpperCase();
            }
            if (word.toLowerCase() === 'and' || word.toLowerCase() === '&') {
                return '&';
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

/**
 * Parses any raw client name and produces a human-friendly addressing object.
 */
export function parseSmartAddressing(rawName: string | null | undefined): ParsedAddressing {
    if (!rawName || !rawName.trim()) {
        return {
            cleanName: 'Valued Subscriber',
            firstName: 'Valued Subscriber',
            salutation: 'Dear Valued Subscriber,',
            title: 'Subscriber',
            gender: '',
            isCorporate: false,
            isCouple: false,
            isJoint: false
        };
    }

    let name = rawName.trim().replace(/\s+/g, ' ');

    // 1. Corporate Entity Check
    if (CORPORATE_REGEX.test(name)) {
        const cleanName = toTitleCase(name);
        return {
            cleanName,
            firstName: cleanName,
            salutation: 'Dear Sir/Madam,',
            title: 'Management',
            gender: 'Corporate',
            isCorporate: true,
            isCouple: false,
            isJoint: false
        };
    }

    // 2. Couple Check (e.g., 'MR & MRS ABRAHAM SALAWU', 'Mr and Mrs John Doe')
    const coupleRegex = /^(MR\.?\s*(?:AND|&)\s*MRS\.?|MR\.?\s*\/\s*MRS\.?)\s+(.+)$/i;
    const coupleMatch = name.match(coupleRegex);
    if (coupleMatch) {
        const remainder = coupleMatch[2].trim();
        const words = remainder.split(' ').filter(Boolean);
        const surname = words.length > 0 ? toTitleCase(words[words.length - 1]) : '';
        const cleanRemainder = toTitleCase(remainder);
        const cleanName = `Mr & Mrs ${cleanRemainder}`;

        return {
            cleanName,
            firstName: surname ? `Mr. & Mrs. ${surname}` : 'Mr. & Mrs.',
            salutation: surname ? `Dear Mr. & Mrs. ${surname},` : 'Dear Mr. & Mrs.,',
            title: 'Mr & Mrs',
            gender: 'Joint',
            isCorporate: false,
            isCouple: true,
            isJoint: true
        };
    }

    // 3. Joint Individuals Check with 'and' or '&' (e.g. 'James Obaji & Olabisi Obaji')
    if (/\s+(?:and|&)\s+/i.test(name)) {
        const parts = name.split(/\s+(?:and|&)\s+/i).map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
            const firstPersonWords = parts[0].split(' ').filter(Boolean);
            const secondPersonWords = parts[1].split(' ').filter(Boolean);

            const firstPFirstName = toTitleCase(firstPersonWords[0] || '');
            const secondPFirstName = toTitleCase(secondPersonWords[0] || '');

            const firstPSurname = firstPersonWords.length > 1 ? toTitleCase(firstPersonWords[firstPersonWords.length - 1]) : '';
            const secondPSurname = secondPersonWords.length > 1 ? toTitleCase(secondPersonWords[secondPersonWords.length - 1]) : '';

            const cleanName = `${toTitleCase(parts[0])} & ${toTitleCase(parts[1])}`;

            let salutation = `Dear ${firstPFirstName} & ${secondPFirstName},`;
            if (firstPSurname && secondPSurname && firstPSurname.toLowerCase() === secondPSurname.toLowerCase()) {
                salutation = `Dear ${firstPFirstName} & ${secondPFirstName} ${secondPSurname},`;
            }

            return {
                cleanName,
                firstName: `${firstPFirstName} & ${secondPFirstName}`,
                salutation,
                title: 'Joint Subscribers',
                gender: 'Joint',
                isCorporate: false,
                isCouple: false,
                isJoint: true
            };
        }
    }

    // 4. Professional / Cultural Titles (e.g. 'ENGR. JOHNLOUIS CHIKA UZOERI')
    for (const prefix of TITLE_PREFIXES) {
        if (prefix.match.test(name)) {
            const remainder = name.replace(prefix.match, '').trim();
            const words = remainder.split(' ').filter(Boolean);
            const firstName = words.length > 0 ? toTitleCase(words[0]) : '';
            const surname = words.length > 1 ? toTitleCase(words[words.length - 1]) : firstName;
            const cleanName = `${prefix.title} ${toTitleCase(remainder)}`;

            return {
                cleanName,
                firstName: surname ? `${prefix.title} ${surname}` : `${prefix.title} ${firstName}`,
                salutation: surname ? `Dear ${prefix.title} ${surname},` : `Dear ${prefix.title} ${firstName},`,
                title: prefix.title,
                gender: (prefix.gender as any) || inferGender(firstName),
                isCorporate: false,
                isCouple: false,
                isJoint: false
            };
        }
    }

    // 5. Standard Individual Prefixes (MR, MRS, MS, MISS)
    const personalPrefixRegex = /^(MR\.?|MRS\.?|MS\.?|MISS)\s+(.+)$/i;
    const personalPrefixMatch = name.match(personalPrefixRegex);
    if (personalPrefixMatch) {
        const prefixRaw = personalPrefixMatch[1].toUpperCase().replace('.', '');
        const remainder = personalPrefixMatch[2].trim();
        const words = remainder.split(' ').filter(Boolean);
        const firstName = words.length > 0 ? toTitleCase(words[0]) : '';
        const surname = words.length > 1 ? toTitleCase(words[words.length - 1]) : firstName;

        let title = 'Mr.';
        let gender: 'Male' | 'Female' = 'Male';
        if (['MRS', 'MS', 'MISS'].includes(prefixRaw)) {
            title = prefixRaw === 'MRS' ? 'Mrs.' : (prefixRaw === 'MISS' ? 'Miss' : 'Ms.');
            gender = 'Female';
        }

        const cleanName = `${title} ${toTitleCase(remainder)}`;
        return {
            cleanName,
            firstName: firstName || surname,
            salutation: surname ? `Dear ${title} ${surname},` : `Dear ${title} ${firstName},`,
            title,
            gender,
            isCorporate: false,
            isCouple: false,
            isJoint: false
        };
    }

    // 6. Standard Full Name (e.g., 'IDRIS TITUS KAYODE', 'ROTJI RAYMOND GIDEON')
    const words = name.split(' ').filter(Boolean);
    const firstName = words.length > 0 ? toTitleCase(words[0]) : 'Subscriber';
    const cleanName = toTitleCase(name);
    const inferred = inferGender(firstName);

    return {
        cleanName,
        firstName,
        salutation: `Dear ${firstName},`,
        title: inferred === 'Female' ? "Ma'am" : (inferred === 'Male' ? "Sir" : ''),
        gender: inferred,
        isCorporate: false,
        isCouple: false,
        isJoint: false
    };
}

/**
 * Safely infers gender from known names or returns empty string
 */
function inferGender(firstName: string): 'Male' | 'Female' | '' {
    if (!firstName) return '';
    const lower = firstName.toLowerCase();
    if (KNOWN_FEMALE_NAMES.has(lower)) return 'Female';
    if (KNOWN_MALE_NAMES.has(lower)) return 'Male';
    return '';
}
