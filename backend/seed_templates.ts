import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("=== SEEDING DEFAULT DOCUMENT TEMPLATES ===");
    const companies = await prisma.company.findMany();
    const templateTypes = ["OFFER", "PROVISIONAL_ALLOCATION", "FINAL_ALLOCATION"];
    
    const defaultContent = `
        <div style="font-family: Arial, sans-serif; padding: 30px; max-width: 800px; margin: auto;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #2c3e50; margin: 0;">{COMPANY_NAME}</h1>
                <p style="color: #7f8c8d; margin-top: 5px;">Head Office | Providing Real Estate Excellence</p>
            </div>
            <hr style="border: 1px solid #bdc3c7;" />
            
            <h2 style="text-align: center; color: #34495e; margin: 30px 0; text-transform: uppercase; letter-spacing: 1px;">
                {DOCUMENT_TYPE}
            </h2>
            
            <div style="margin-bottom: 30px;">
                <p><strong>Date:</strong> {CURRENT_DATE}</p>
                <p><strong>Client Name:</strong> {CLIENT_NAME}</p>
                <p><strong>Client Phone:</strong> {CLIENT_PHONE}</p>
            </div>

            <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #3498db; margin-bottom: 30px;">
                <h3 style="margin-top: 0; color: #2c3e50;">Property Details</h3>
                <p style="margin: 5px 0;"><strong>Estate:</strong> {ESTATE_NAME} - {ESTATE_LOCATION}</p>
                <p style="margin: 5px 0;"><strong>Property Type:</strong> {PRODUCT_NAME}</p>
                <p style="margin: 5px 0;"><strong>Total Value:</strong> ₦{PRODUCT_PRICE}</p>
            </div>
            
            <p style="line-height: 1.6; color: #2c3e50;">
                Dear <strong>{CLIENT_NAME}</strong>,<br/><br/>
                This authentic document acts as your official <strong>{DOCUMENT_TYPE}</strong> for the property listed above. All terms and conditions defined by the company exclusively apply to this allocation. Congratulations on your acquisition!
            </p>
            
            <div style="margin-top: 80px; display: flex; justify-content: space-between;">
                <div>
                    <p style="margin-bottom: 5px;">___________________________</p>
                    <p style="margin: 0; font-weight: bold; color: #2c3e50;">{MD_NAME}</p>
                    <p style="margin: 0; color: #7f8c8d; font-size: 14px;">Managing Director, {COMPANY_NAME}</p>
                </div>
            </div>
        </div>
    `;

    for (const company of companies) {
        for (const type of templateTypes) {
            await prisma.documentTemplate.upsert({
                where: {
                    companyId_type: { companyId: company.id, type }
                },
                update: {}, // Don't overwrite if they exist
                create: {
                    companyId: company.id,
                    type,
                    content: defaultContent.replace('{DOCUMENT_TYPE}', type.replace('_', ' '))
                }
            });
        }
        console.log(`✅ Assigned Document Templates -> ${company.name}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
