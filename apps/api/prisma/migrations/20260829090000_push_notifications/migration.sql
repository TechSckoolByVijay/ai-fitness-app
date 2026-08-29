-- Server-sent reminder delivery.
--
-- Reminders were scheduled locally on the device, so a reinstall, a new
-- phone, or cleared app data silently lost them. The server now owns
-- delivery, which needs three things: somewhere to send (PushToken), the
-- user's timezone (a reminder time is local wall-clock, meaningless in UTC),
-- and a record of what already fired today so a restart or a second API
-- replica cannot double-send.

-- CreateTable
CREATE TABLE "PushToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- The token, not the user, is unique: one user may have several devices, and
-- a device handed to someone else must re-point rather than duplicate.
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "timeZone" TEXT;
ALTER TABLE "NotificationPreference" ADD COLUMN "lastSentOn" TEXT;
