const fs = require('fs');

let content = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');

const target = `  marketer          User?           @relation("SaleMarketer", fields: [marketerId], references: [id])
  discountCode      DiscountCode?   @relation(fields: [discountCodeId], references: [id])`;

const replacement = `  marketer          User?           @relation("SaleMarketer", fields: [marketerId], references: [id])
  referrer          User?           @relation("SaleReferrer", fields: [referrerId], references: [id])
  discountCode      DiscountCode?   @relation(fields: [discountCodeId], references: [id])`;

content = content.replace(target, replacement);

if (!content.includes('referrer          User?           @relation("SaleReferrer"')) {
    // try with \r\n
    const target2 = `  marketer          User?           @relation("SaleMarketer", fields: [marketerId], references: [id])\r\n  discountCode      DiscountCode?   @relation(fields: [discountCodeId], references: [id])`;
    const replacement2 = `  marketer          User?           @relation("SaleMarketer", fields: [marketerId], references: [id])\r\n  referrer          User?           @relation("SaleReferrer", fields: [referrerId], references: [id])\r\n  discountCode      DiscountCode?   @relation(fields: [discountCodeId], references: [id])`;
    content = content.replace(target2, replacement2);
}

fs.writeFileSync('backend/prisma/schema.prisma', content);
console.log("Updated Prisma Schema!");
