import prisma from '../config/prisma.js';

async function initWalletSystem() {
    console.log("Initializing Messaging Wallet System...");

    // 1. Initialize MessagingTariff
    let tariff = await prisma.messagingTariff.findFirst();
    if (!tariff) {
        tariff = await prisma.messagingTariff.create({
            data: {
                smsRatePerPage: 9.50,
                emailRatePerMsg: 2.50,
                waRatePerMsg: 15.00,
                minTopupAmount: 3000.00,
                defaultWelcomeCredit: 100.00
            }
        });
        console.log("Created initial MessagingTariff:", tariff);
    } else {
        console.log("Existing MessagingTariff found:", tariff);
    }

    // 2. Initialize Wallets for all existing non-Customer-Care users without a wallet
    const users = await prisma.user.findMany({
        include: { wallet: true }
    });

    console.log(`Found ${users.length} total users in CRM.`);
    let createdCount = 0;

    for (const user of users) {
        if (!user.wallet) {
            const welcomeCredit = tariff.defaultWelcomeCredit || 100.00;
            const wallet = await prisma.userWallet.create({
                data: {
                    userId: user.id,
                    balance: welcomeCredit,
                    currency: "NGN",
                    transactions: {
                        create: {
                            userId: user.id,
                            amount: welcomeCredit,
                            balanceAfter: welcomeCredit,
                            type: "CREDIT",
                            category: "ADMIN_GIFT",
                            paymentMethod: "SYSTEM",
                            description: "Welcome Initial Messaging Balance"
                        }
                    }
                }
            });
            createdCount++;
            console.log(`Created wallet for ${user.fullName} (${user.role}) with ₦${welcomeCredit} welcome credit.`);
        }
    }

    console.log(`Successfully initialized ${createdCount} staff wallets.`);
}

initWalletSystem()
    .catch((err) => {
        console.error("Initialization error:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
