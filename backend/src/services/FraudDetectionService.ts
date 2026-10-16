import prisma from '../config/prisma.js';

export class FraudDetectionService {
    static async enrichWithFraudWarnings(payments: any[]) {
        if (!payments || payments.length === 0) {
            return [];
        }

        // 1. Collect all receipt hashes across all payments
        const allHashesSet = new Set<string>();
        const paymentHashesMap = new Map<string, string[]>();

        for (const payment of payments) {
            if (payment.receiptHashes) {
                try {
                    const parsed = JSON.parse(payment.receiptHashes);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const validHashes = parsed.filter(Boolean);
                        paymentHashesMap.set(payment.id, validHashes);
                        validHashes.forEach(h => allHashesSet.add(h));
                    }
                } catch (e) {}
            }
        }

        // 2. Collect date range, unique amounts, and unique methods for behavioral match
        const validDates = payments
            .map(p => new Date(p.date).getTime())
            .filter(t => !isNaN(t));

        let minDate: Date | null = null;
        let maxDate: Date | null = null;

        if (validDates.length > 0) {
            const minTime = Math.min(...validDates);
            const maxTime = Math.max(...validDates);
            minDate = new Date(minTime);
            minDate.setHours(0, 0, 0, 0);
            maxDate = new Date(maxTime);
            maxDate.setHours(23, 59, 59, 999);
        }

        const uniqueAmounts = Array.from(new Set(payments.map(p => p.amount)));
        const uniqueMethods = Array.from(new Set(payments.map(p => p.method).filter(Boolean)));

        // Run batch queries in parallel: 1 query for hash candidates, 1 query for behavioral candidates
        const [hashCandidatePayments, behavioralCandidatePayments] = await Promise.all([
            allHashesSet.size > 0
                ? prisma.payment.findMany({
                    where: {
                        OR: Array.from(allHashesSet).map(hash => ({
                            receiptHashes: { contains: `"${hash}"` }
                        }))
                    },
                    select: {
                        id: true,
                        amount: true,
                        status: true,
                        proofOfPaymentUrl: true,
                        receiptHashes: true,
                        date: true,
                        method: true,
                        sale: {
                            select: {
                                marketer: {
                                    select: {
                                        fullName: true,
                                        branch: {
                                            select: {
                                                name: true,
                                                company: { select: { name: true } }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                })
                : Promise.resolve([]),

            minDate && maxDate && uniqueAmounts.length > 0 && uniqueMethods.length > 0
                ? prisma.payment.findMany({
                    where: {
                        amount: { in: uniqueAmounts },
                        method: { in: uniqueMethods },
                        date: { gte: minDate, lte: maxDate }
                    },
                    select: {
                        id: true,
                        amount: true,
                        status: true,
                        proofOfPaymentUrl: true,
                        date: true,
                        method: true,
                        sale: {
                            select: {
                                marketer: {
                                    select: {
                                        fullName: true,
                                        branch: {
                                            select: {
                                                name: true,
                                                company: { select: { name: true } }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                })
                : Promise.resolve([])
        ]);

        // Pre-index behavioral matches by `amount_method_dateString`
        const behavioralByBucket = new Map<string, any[]>();
        for (const candidate of behavioralCandidatePayments) {
            const dateStr = new Date(candidate.date).toDateString();
            const key = `${candidate.amount}_${candidate.method}_${dateStr}`;
            if (!behavioralByBucket.has(key)) {
                behavioralByBucket.set(key, []);
            }
            behavioralByBucket.get(key)!.push(candidate);
        }

        // Process each payment in memory in O(1)
        const enrichedPayments = [];

        for (const payment of payments) {
            let fraudWarnings = null;
            let totalClaimedValue = payment.amount;
            const duplicateDetails: any[] = [];

            // 1. Check exact hash matches
            const hashMatches: any[] = [];
            const pHashes = paymentHashesMap.get(payment.id);
            if (pHashes && pHashes.length > 0) {
                for (const candidate of hashCandidatePayments) {
                    if (candidate.id === payment.id) continue;
                    if (!candidate.receiptHashes) continue;
                    const isMatch = pHashes.some(h => candidate.receiptHashes?.includes(`"${h}"`));
                    if (isMatch) {
                        hashMatches.push(candidate);
                    }
                }
            }

            // 2. Check behavioral match
            const pDateStr = new Date(payment.date).toDateString();
            const pKey = `${payment.amount}_${payment.method}_${pDateStr}`;
            const behavioralMatches = (behavioralByBucket.get(pKey) || []).filter(c => c.id !== payment.id);

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
