-- Store money as numeric(19,4) rather than double precision.
--
-- double precision cannot represent decimal cents exactly, so sums drift and
-- equality comparisons on an amount are unreliable. numeric is exact, and
-- Postgres aggregates over it are exact too.
--
-- Widening double precision to numeric(19,4) preserves every existing value
-- for any realistic money figure. Ratios, confidence scores and share
-- quantities deliberately stay double precision — binary floating point is
-- the right representation for those.
-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "advisor_profiles" ALTER COLUMN "monthlyIncomeAvg" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "monthlyExpenseAvg" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "budget_histories" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "spent" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "remaining" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "budget_plans" ALTER COLUMN "incomePlan" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "budgets" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "spent" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "remaining" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "rolloverAmount" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "goal_contributions" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "goals" ALTER COLUMN "targetAmount" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "currentAmount" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "holdings" ALTER COLUMN "avgCostBasis" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "currentPrice" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "receipts" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "recommendations" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "recurring_patterns" ALTER COLUMN "amountAvg" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "amountLast" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "spending_patterns" ALTER COLUMN "avgAmount" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "minAmount" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "maxAmount" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "monthAvg" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "monthlyIncome" SET DATA TYPE DECIMAL(19,4);

