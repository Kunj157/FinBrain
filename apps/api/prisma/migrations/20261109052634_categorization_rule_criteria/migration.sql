-- AlterTable
ALTER TABLE "categorization_rules" ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "amountMax" DECIMAL(19,4),
ADD COLUMN     "amountMin" DECIMAL(19,4);

-- AddForeignKey
ALTER TABLE "categorization_rules" ADD CONSTRAINT "categorization_rules_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
