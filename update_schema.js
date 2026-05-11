const fs = require('fs');
let content = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');

content = content.replace(
  'executiveMemos       ExecutiveMemo[]\r\n}',
  'executiveMemos       ExecutiveMemo[]\r\n  teams                Team[]\r\n}'
);
content = content.replace(
  'executiveMemos       ExecutiveMemo[]\n}',
  'executiveMemos       ExecutiveMemo[]\n  teams                Team[]\n}'
);

content = content.replace(
  'corporateBankAccounts CorporateBankAccount[]\r\n}',
  'corporateBankAccounts CorporateBankAccount[]\r\n  teams                Team[]\r\n}'
);
content = content.replace(
  'corporateBankAccounts CorporateBankAccount[]\n}',
  'corporateBankAccounts CorporateBankAccount[]\n  teams                Team[]\n}'
);

content = content.replace(
  'targetedHrRecs         HRRecommendation[]   @relation("HRRecommendationTarget")\r\n}',
  'targetedHrRecs         HRRecommendation[]   @relation("HRRecommendationTarget")\r\n  teamId                 String?\r\n  team                   Team?                @relation("TeamMembers", fields: [teamId], references: [id])\r\n  ledTeam                Team?                @relation("TeamLead")\r\n  managedTeams           Team[]               @relation("TeamBdm")\r\n  teamMessagesSent       TeamMessage[]        @relation("MessageSender")\r\n}'
);
content = content.replace(
  'targetedHrRecs         HRRecommendation[]   @relation("HRRecommendationTarget")\n}',
  'targetedHrRecs         HRRecommendation[]   @relation("HRRecommendationTarget")\n  teamId                 String?\n  team                   Team?                @relation("TeamMembers", fields: [teamId], references: [id])\n  ledTeam                Team?                @relation("TeamLead")\n  managedTeams           Team[]               @relation("TeamBdm")\n  teamMessagesSent       TeamMessage[]        @relation("MessageSender")\n}'
);

fs.writeFileSync('backend/prisma/schema.prisma', content);
