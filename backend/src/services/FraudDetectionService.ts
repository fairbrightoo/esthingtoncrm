import prisma from '../config/prisma.js';

export class FraudDetectionService {
    static async enrichWithFraudWarnings(payments: any[]) {
        const enrichedPayments = [];

        for (const payment of payments) {
            let fraudWarnings = null;
            let totalClaimedValue = payment.amount;
            const duplicateDetails: any[] = [];

            // 1. Exact Hash Match
            let hashMatches: any[] = [];
            if (payment.receiptHashes) {
                let parsedHashes: string[] = [];
                try {
                    parsedHashes = JSON.parse(payment.receiptHashes);
                } catch (e) {}

                if (parsedHashes.length > 0) {
                    const orConditions = parsedHashes.map((hash: string) => ({
                        receiptHashes: { contains: `"${hash}"` }
                    }));

                    hashMatches = await prisma.payment.findMany({
                        where: {
                            id: { not: payment.id },
                            OR: orConditions
                        },
                        include: {
                            sale: {
                                include: {
                                    marketer: { include: { branch: { include: { company: true } } } }
                                }
                            }
                        }
                    });
                }
            }

            // 2. Behavioral Match (Same Date, Amount, Method)
            const startOfDay = new Date(payment.date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(payment.date);
            endOfDay.setHours(23, 59, 59, 999);

            const behavioralMatches = await prisma.payment.findMany({
                where: {
                    id: { not: payment.id },
                    amount: payment.amount,
                    method: payment.method,
                    date: { gte: startOfDay, lte: endOfDay }
                },
                include: {
                    sale: {
                        include: {
                            marketer: { include: { branch: { include: { company: true } } } }
                        }
                    }
                }
            });

            // Combine unique matches
            const allMatchesMap = new Map();
            hashMatches.forEach(m => allMatchesMap.set(m.id, { ...m, matchType: 'EXACT_HASH' }));
            behavioralMatches.forEach(m => {
                if (!allMatchesMap.has(m.id)) {
                    allMatchesMap.set(m.id, { ...m, matchType: 'BEHAVIORAL' });
                }
            });

            const allMatches = Array.from(allMatchesMap.values());

            if (allMatches.length > 0) {
                let exactHashCount = 0;
                let behavioralCount = 0;

                allMatches.forEach(m => {
                    totalClaimedValue += m.amount;
                    if (m.matchType === 'EXACT_HASH') exactHashCount++;
                    else if (m.matchType === 'BEHAVIORAL') behavioralCount++;

                    let imgUrl = null;
                    if (m.proofOfPaymentUrl) {
                        try {
                            const parsed = JSON.parse(m.proofOfPaymentUrl);
                            if (parsed.length > 0) imgUrl = parsed[0];
                        } catch (e) {
                            imgUrl = m.proofOfPaymentUrl;
                        }
                    }

                    const companyName = m.sale?.marketer?.branch?.company?.name;
                    const branchName = m.sale?.marketer?.branch?.name;
                    const fullBranchName = companyName && branchName ? `${companyName} - ${branchName}` : branchName || 'Unknown Branch';

                    duplicateDetails.push({
                        id: m.id,
                        branchName: fullBranchName,
                        marketerName: m.sale?.marketer?.fullName || 'Unknown Marketer',
                        amount: m.amount,
                        status: m.status,
                        receiptImage: imgUrl,
                        matchType: m.matchType
                    });
                });

                let primaryMessage = '';
                let level = 'YELLOW';

                if (exactHashCount > 0) {
                    level = 'RED';
                    primaryMessage = `DUPLICATE RECEIPT DETECTED: This exact file was submitted ${exactHashCount} time(s) previously.`;
                } else {
                    level = 'YELLOW';
                    primaryMessage = `POTENTIAL MATCH: There are ${behavioralCount} other ₦${payment.amount.toLocaleString()} ${payment.method} payments recorded today across the network. Please verify visually.`;
                }

                fraudWarnings = {
                    level,
                    primaryMessage,
                    totalClaimedValue,
                    duplicateDetails
                };
            }

            enrichedPayments.push({
                ...payment,
                fraudWarnings
            });
        }

        return enrichedPayments;
    }
}
