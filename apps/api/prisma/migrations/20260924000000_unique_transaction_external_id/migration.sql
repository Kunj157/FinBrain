-- Make a provider's transaction id unique per user, so re-running a bank sync
-- cannot write a second copy of the same transaction.
--
-- Safe on existing data: NULL externalId (every manually entered row) is
-- treated as distinct by Postgres, so only real provider ids are constrained.
CREATE UNIQUE INDEX "transactions_userId_externalId_key" ON "transactions"("userId", "externalId");
