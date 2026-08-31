-- Per-user overrides of the standard tables.
--
-- A scoop is ~32g by convention, but a user whose scoop is 35g should get 35g
-- from then on rather than being quietly wrong forever. Same for how hard
-- someone actually trains: the MET tables are an average, not this person.
--
-- One flexible table keyed by (kind, key) rather than a column per
-- preference, so adding a new kind of override needs no migration.

-- CreateEnum
CREATE TYPE "UserPreferenceKind" AS ENUM ('unit_weight', 'activity_intensity');

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "UserPreferenceKind" NOT NULL,
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- One value per (user, kind, key): setting a scoop twice replaces it rather
-- than accumulating conflicting answers.
CREATE UNIQUE INDEX "UserPreference_userId_kind_key_key" ON "UserPreference"("userId", "kind", "key");
CREATE INDEX "UserPreference_userId_kind_idx" ON "UserPreference"("userId", "kind");

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
