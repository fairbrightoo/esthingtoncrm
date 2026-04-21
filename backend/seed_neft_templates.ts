import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HEADER_IMAGE = `<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
    <!-- Provide your absolute logo URL here or it defaults to a visually similar placeholder -->
    {{COMPANY_LOGO}}
    <div style="background-color: #c00030; color: white; padding: 10px; font-size: 10px; font-weight: bold; border-radius: 8px;">
        • REAL ESTATE MARKETING<br/>
        • ESTATE DEVELOPMENT<br/>
        • ESTATE MANAGEMENT<br/>
        • REAL ESTATE CONSULTANCY<br/>
        • CONSTRUCTION<br/>
        • INFRASTRUCTURE
    </div>
</div>`;

const SIGNATURE_BLOCK = `<div style="margin-top: 40px; text-align: left;">
    {{COMPANY_SIGNATURE}}<br/>
    <strong>{{MD_NAME}}</strong><br/>
    <strong>Group Managing Director, {{COMPANY_NAME}}</strong>
</div>`;

const FOOTER_BLOCK = `<!-- Footer Mockup -->
<div style="background-color: #c00030; color: white; padding: 10px; font-size: 10px; margin-top: 50px; display: flex; justify-content: space-between;">
    <div>📍 {{BRANCH_ADDRESS}}</div>
    <div>🌐 {{COMPANY_WEBSITE}} | ✉️ {{COMPANY_EMAIL}}</div>
    <div>📞 {{BRANCH_PHONE}}</div>
</div>`;

const OFFER_LETTER = `
<div style="font-family: Arial, sans-serif; padding: 30px; max-width: 800px; margin: auto; font-size: 14px;">
    ${HEADER_IMAGE}
    
    <div style="margin-bottom: 20px; font-weight: bold;">
        {{CLIENT_NAME}}<br/>
        {{CLIENT_PHONE}}<br/>
    </div>
    
    <div style="text-align: right; font-weight: bold; margin-bottom: 20px;">
        {{CURRENT_DATE}}
    </div>
    
    <p style="font-weight: bold;">Dear Sir/Ma,</p>
    
    <h3 style="text-align: center; text-decoration: underline; font-weight: bold;">OFFER LETTER</h3>
    
    <p>Following your expression of interest and application for 1 unit of about <b>{{PROTOTYPE}}</b> space in <b>{{ESTATE_NAME}}, {{LOCATION}}</b>. This offer is made subject to the following terms and conditions;</p>
    
    <ol style="line-height: 1.6;">
        <li><b>APPLICATION FEE</b> is <strong>₦10,000</strong> non-refundable.</li>
        <li><b>LAND PAYMENT:</b> The disposable price of the property is <strong>{{AGREED_PRICE}}</strong> at a discounted price.<br/>
            i. A provisional Allocation will be issued to you upon making a part payment for the land while Letter of allocation will be given to you upon full payment for the plot of Land.
        </li>
        <li><b>SETTING OUT AND EXCAVATION FEE:</b> 4 Bedroom Terrace Duplex is <strong>₦400,000.00</strong><br/>
            i. Setting out and excavation is strictly handled by the company's team of Engineers while the foundation to DPC level can be handled by the company or your qualified engineers to be supervised by our construction team.
        </li>
        <li><b>INFRASTRUCTURE FEE:</b> 4 Bedroom Terrace Duplex is <strong>₦3,000,000.00</strong><br/>
            i. Payment for infrastructure shall commence when the individual starts work on the plot of Land.<br/>
            ii. That you are expected to pay <b>Infrastructural Fees</b> into Company's Bank Account - <b>1229247409 - ZENITH BANK ({{COMPANY_NAME}}).</b><br/>
            The mode of payment (Infrastructure Fee) is as follows;<br/>
            <ul style="margin-top: 5px; margin-bottom: 5px;">
                <li>20% after DPC</li>
                <li>15% at lintel level</li>
                <li>20% after decking</li>
                <li>20% at lintel level of upper floor</li>
                <li>25% after roofing</li>
            </ul>
            <strong>NB:</strong> This is however subject to change due to fluctuations in the prices of building materials.
        </li>
        <li>Upon request for refund of any deposit made in favour of {{COMPANY_NAME}}, refund process shall take a period of 90 days and less with 20% administrative charge deduction.</li>
        <li>That the building, if it will be constructed by you, must be supervised by our construction team to ensure adherence to standard at the cost of <strong>₦200,000.00</strong> Only.</li>
        <li>You cannot occupy your building until full payment for infrastructure fee is made.</li>
        <li>If this offer is accepted by you, all Land Payments in {{ESTATE_NAME}}, {{LOCATION}} shall be forwarded in favour of {{COMPANY_NAME}}.<br/>
        <b>ZENITH BANK - 1229247409.</b></li>
    </ol>
    
    <p><b>NB: This offer letter is valid for one week.</b><br/>
    <b>Be assured of our warmest regard.</b></p>
    
    ${SIGNATURE_BLOCK}
    ${FOOTER_BLOCK}
</div>
`;

const PROVISIONAL_ALLOCATION = `
<div style="font-family: Arial, sans-serif; padding: 30px; max-width: 800px; margin: auto; font-size: 14px;">
    ${HEADER_IMAGE}
    
    <div style="margin-bottom: 20px; font-weight: bold;">
        {{CLIENT_NAME}}<br/>
        {{CLIENT_PHONE}}<br/>
    </div>
    
    <div style="text-align: right; font-weight: bold; margin-bottom: 20px;">
        {{CURRENT_DATE}}
    </div>
    
    <p style="font-weight: bold;">Dear Sir/Ma,</p>
    
    <h3 style="text-align: center; text-decoration: underline; font-weight: bold;">PROVISIONAL ALLOCATION OF LAND SPACE AT {{ESTATE_NAME}}, {{LOCATION}}</h3>
    
    <p>Following your application and interest at <b>{{ESTATE_NAME}}, {{LOCATION}}</b>, and upon payment of the sum of <strong>₦1,000,000.00</strong> only, we are glad to convey to you a provisional allocation of land space of about <b>{{PROTOTYPE}}</b>, subject to the conditions hereunder appearing.</p>
    
    <ol style="line-height: 1.6;">
        <li>The final allocation of the land space described above is subject to payment of the balance sum <strong>{{BALANCE_OUTSTANDING}}</strong> only on or before 12 months from the date of this provisional allocation.</li>
        <li>That this land space is to be used for the construction of a <b>4 BEDROOM TERRACE DUPLEX.</b></li>
        <li>That a work permit shall be issued before commencement of any construction upon discharge of <b>100%</b> payment of cost of land space.</li>
        <li>That you are to build strictly according to prototype issued to you.</li>
        <li>That all construction works at <b>{{ESTATE_NAME}}</b> is to be supervised by our construction team.</li>
        <li>The failure of <b>100%</b> payment of cost of land space within <b>SIX MONTHS</b> risk revocation upon one-month notice and relocation to the next phase of the project or attract additional charge (5% 3months, 10% 6months, 20% 12months) on the said balance amount.</li>
        <li>Withdrawal of interest, or request for refund attract 20% charge.</li>
        <li>That this allocation is not transferable without the prior consent of the developer/company.</li>
        <li>That the company has the right to stop your construction if you do not pay up where there is an outstanding balance or deviate from the approved standard of construction.</li>
        <li>That it is the sole responsibility of the developer/company to <b>PERPETUALLY</b> appoint a facility Manager for <b>{{ESTATE_NAME}}</b>.</li>
        <li>That you are obligated to pay a facility management fee which is subject to change by the appointed facility manager on or before the 15th day of January of every year.</li>
        <li>That you are expected to pay your infrastructure fee before occupation of your building.</li>
    </ol>
    
    <p style="margin-top: 30px;"><b>CONGRATULATIONS.</b></p>
    
    ${SIGNATURE_BLOCK}
    ${FOOTER_BLOCK}
</div>
`;

const FINAL_ALLOCATION = `
<div style="font-family: Arial, sans-serif; padding: 30px; max-width: 800px; margin: auto; font-size: 14px;">
    ${HEADER_IMAGE}
    
    <div style="margin-bottom: 20px; font-weight: bold;">
        {{CLIENT_NAME}}<br/>
        {{CLIENT_PHONE}}<br/>
    </div>
    
    <div style="text-align: right; font-weight: bold; margin-bottom: 20px;">
        {{CURRENT_DATE}}
    </div>
    
    <p style="font-weight: bold;">Dear Sir/Ma,</p>
    
    <h3 style="text-align: center; text-decoration: underline; font-weight: bold;">LETTER OF ALLOCATION FOR {{ESTATE_NAME}}, {{LOCATION}}</h3>
    
    <p>With reference to your application for a plot of land at <b>{{ESTATE_NAME}}, {{LOCATION}}</b>, we are glad to convey to you with pleasure the allocation of Plot No. <b>{{PLOT_NUMBER}}</b> of about <b>{{PROTOTYPE}}</b> subject to the following terms and conditions.</p>
    
    <ol style="line-height: 1.6;">
        <li>That this land is to be used for the construction of a <b>4 BEDROOM FULLY DETACHED DUPLEX, WITH ATTACHED BQ.</b></li>
        <li>That you must commence work within <b>THREE (3) MONTHS</b> from the date of this allocation.</li>
        <li>That the company reserves the right to revoke this allocation if no development takes place within the stipulated period. However, you will be relocated to the next phase of the estate, where you will have <b>THREE (3) MONTHS</b> period to commence development.</li>
        <li>Withdrawal of interest and/or request for refund attract 20% charge.</li>
        <li>That you should notify the company before commencement of any work on site.</li>
        <li>That the setting out must be carried out by our site officers at a moderate fee of <strong>₦500,000.00</strong> only. This is to ensure accuracy.</li>
        <li>That you must build in accordance to the prototype given to you.</li>
        <li>That you must not extend or make any adjustment to the approved prototype or land space allocated to you.</li>
        <li>That the building, if it will be constructed by you, must be supervised by our construction team to ensure adherence to standard at the cost of <strong>₦100,000.00</strong> Only.</li>
        <li>That the company's engineer must be contacted for the erection of perimeter fence to ensure accuracy.</li>
        <li>That you are to produce a qualified builder or engineer as a site supervisor.</li>
        <li>That this allocation must not be transferred without prior knowledge of the company.</li>
        <li>That the company has the right to stop your construction if you do not pay up where there is an outstanding balance or deviate from approved standard of construction.</li>
        <li>That it is the sole responsibility of {{COMPANY_NAME}} to <b>PERPETUALLY</b> appoint a Facility Manager for the Estate.</li>
        <li>That you are obligated to pay a facility manager fee to {{COMPANY_NAME}} or its facility Manager on or before 15th day of January of every year.</li>
        <li>That you are expected to pay infrastructural charge of <strong>₦4,000,000.00</strong> Only, to the company's account viz; <b>1229247409 - ZENITH BANK ({{COMPANY_NAME}}).</b><br/>
            The mode of payments as follow:<br/>
            I. 20% after DPC<br/>
            II. 15% at lintel level<br/>
            III. 20% after decking<br/>
            IV. 20% at lintel level of upper floor<br/>
            V. 25% after roofing
        </li>
        <li>You <b>CANNOT</b> occupy your building until full payment of infrastructure charge is made.</li>
    </ol>
    
    <p style="margin-top: 30px;"><b>CONGRATULATIONS.</b></p>
    
    ${SIGNATURE_BLOCK}
    ${FOOTER_BLOCK}
</div>
`;

async function seedNeftDocs() {
    console.log("=== INJECTING NEFT HTML TEMPLATES ===");
    
    const companies = await prisma.company.findMany();
    
    for (const company of companies) {
        if (!company.name.toLowerCase().includes("neft")) {
            continue;
        }
        
        // Upsert Offer Letter
        await prisma.documentTemplate.upsert({
            where: { companyId_type: { companyId: company.id, type: 'OFFER' } },
            update: { content: OFFER_LETTER },
            create: { companyId: company.id, type: 'OFFER', content: OFFER_LETTER }
        });
        
        // Upsert Provisional Allocation
        await prisma.documentTemplate.upsert({
            where: { companyId_type: { companyId: company.id, type: 'PROVISIONAL_ALLOCATION' } },
            update: { content: PROVISIONAL_ALLOCATION },
            create: { companyId: company.id, type: 'PROVISIONAL_ALLOCATION', content: PROVISIONAL_ALLOCATION }
        });
        
        // Upsert Final Allocation
        await prisma.documentTemplate.upsert({
            where: { companyId_type: { companyId: company.id, type: 'FINAL_ALLOCATION' } },
            update: { content: FINAL_ALLOCATION },
            create: { companyId: company.id, type: 'FINAL_ALLOCATION', content: FINAL_ALLOCATION }
        });
        console.log(`✅ Seeded NEFT templates for company: ${company.name}`);
    }
    
    console.log("=== TEMPLATES SUCCESSFULLY UPDATED ===");
}

seedNeftDocs().catch(console.error).finally(() => prisma.$disconnect());
