-- Not every organization has an account number. The unique index is kept: Postgres treats
-- NULLs as distinct, so any number of organizations may go without one.

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "account_number" DROP NOT NULL;
