const fs = require('fs');
const file = 'backend/prisma/schema.prisma';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
    /discountCodeId    String\?/,
    `discountCodeId    String?
  marketerCommissionRate Float?
  referrerId             String?
  referrerCommissionRate Float?`
);

c = c.replace(
    /isCommissionPaid      Boolean   @default\(false\)\n  commissionDisbursedAt DateTime\?/,
    `isCommissionPaid      Boolean   @default(false)
  commissionDisbursedAt DateTime?
  isReferralCommissionPaid Boolean @default(false)
  referralCommissionDisbursedAt DateTime?`
);

c += `

model ReferralCode {
  id          String   @id @default(uuid())
  code        String   @unique
  creatorId   String
  creator     User     @relation("CreatedReferralCodes", fields: [creatorId], references: [id])
  percentage  Float
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  users       User[]   @relation("UsedReferralCode")
}
`;

fs.writeFileSync(file, c);
console.log("Prisma Schema patched successfully.");
