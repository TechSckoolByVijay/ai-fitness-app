-- Reminders: allow more than one per category, and label the user-added ones.
--
-- Previously [userId, category] was unique, so a user could hold exactly one
-- reminder of each kind. That constraint was the only thing preventing
-- "add another reminder" (e.g. a lunch nudge alongside a dinner nudge).

-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN "label" TEXT;

-- DropIndex
DROP INDEX "NotificationPreference_userId_category_key";

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- A partial unique index keeps the old guarantee where it still matters:
-- at most one BUILT-IN row (label IS NULL) per category per user. User-added
-- rows carry a label and are unconstrained, so duplicates are allowed there
-- by design.
CREATE UNIQUE INDEX "NotificationPreference_userId_category_builtin_key"
  ON "NotificationPreference"("userId", "category")
  WHERE "label" IS NULL;

-- Backfill the three built-in reminders for every existing user. Before this,
-- rows were created lazily on first edit, so most users have none — and the
-- API now addresses reminders by id, which requires the row to exist.
-- ON CONFLICT DO NOTHING makes this safe for users who already customised one.
INSERT INTO "NotificationPreference" ("id", "userId", "category", "label", "enabled", "preferredTime", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  u."id",
  c."category"::"NotificationCategory",
  NULL,
  TRUE,
  c."defaultTime",
  NOW(),
  NOW()
FROM "User" u
CROSS JOIN (VALUES
  ('water',         '11:00'),
  ('sleep',         '22:00'),
  ('goal_progress', '20:00')
) AS c("category", "defaultTime")
ON CONFLICT DO NOTHING;
