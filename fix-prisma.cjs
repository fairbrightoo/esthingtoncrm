const fs = require('fs');

let content = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');

// 1. Add salesReferred to User
content = content.replace(
    '  sales                  Sale[]               @relation("SaleMarketer")',
    '  salesMarketer          Sale[]               @relation("SaleMarketer")\n  salesReferred          Sale[]               @relation("SaleReferrer")'
);

// 2. Add referrer to Sale
content = content.replace(
    '  marketer          User?           @relation("SaleMarketer", fields: [marketerId], references: [id])\n  discountCode      DiscountCode?   @relation(fields: [discountCodeId], references: [id])',
    '  marketer          User?           @relation("SaleMarketer", fields: [marketerId], references: [id])\n  referrer          User?           @relation("SaleReferrer", fields: [referrerId], references: [id])\n  discountCode      DiscountCode?   @relation(fields: [discountCodeId], references: [id])'
);

fs.writeFileSync('backend/prisma/schema.prisma', content);
console.log("Updated Prisma Schema!");
