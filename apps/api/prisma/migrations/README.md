# Migrations

Deployments apply schema changes with `prisma migrate deploy`. Do **not** use
`prisma db push` against staging or production — it mutates the database
without recording anything, which is how this directory drifted 15 tables
behind the schema in the first place.

## Existing databases created with `db push`

A database built by `db push` has the right tables but an empty
`_prisma_migrations` table, so `migrate deploy` will try to re-create objects
that already exist and fail. Baseline it once, per environment:

```bash
# Mark the already-present schema as applied without running any SQL.
pnpm --filter @finbrain/api exec prisma migrate resolve \
  --applied 20260713213225_add_accounts_and_rules
pnpm --filter @finbrain/api exec prisma migrate resolve \
  --applied 20260921000000_add_advisor_household_investments
```

Afterwards `prisma migrate deploy` runs normally and only applies new
migrations.

Fresh databases need none of this — `migrate deploy` builds them from empty.

## Adding a migration

```bash
pnpm --filter @finbrain/api exec prisma migrate dev --name <short_description>
```

Review the generated SQL before committing it. Watch for `DROP COLUMN` and
`DROP TABLE`: Prisma emits them whenever a field disappears from the schema,
and on a live database that is unrecoverable data loss. If a rename is
intended, hand-edit the migration to `ALTER TABLE ... RENAME` instead.

## Verifying a change

`migrate deploy` against a scratch database should leave no drift:

```bash
createdb finbrain_shadow
DATABASE_URL=postgresql://.../finbrain_shadow \
  pnpm --filter @finbrain/api exec prisma migrate deploy

# Must print "This is an empty migration."
pnpm --filter @finbrain/api exec prisma migrate diff \
  --from-url postgresql://.../finbrain_shadow \
  --to-schema-datamodel apps/api/prisma/schema.prisma --script

dropdb finbrain_shadow
```
