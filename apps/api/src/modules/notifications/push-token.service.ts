import type { PrismaClient } from '@prisma/client';
import type { RegisterPushTokenRequest } from '@fitness-app/shared';

/**
 * Records where to send this user's reminders.
 *
 * Upserted on the token rather than the user: one person may have several
 * devices, and a device handed to someone else must re-point to the new
 * owner instead of creating a duplicate that notifies the wrong person.
 */
export async function registerPushToken(
  prisma: PrismaClient,
  userId: string,
  input: RegisterPushTokenRequest,
): Promise<void> {
  await prisma.pushToken.upsert({
    where: { token: input.token },
    update: { userId, platform: input.platform ?? null },
    create: { userId, token: input.token, platform: input.platform ?? null },
  });

  // The timezone travels with the token because it is a property of the
  // device, and it is the only thing that makes a local reminder time
  // meaningful on the server.
  if (input.timeZone) {
    await prisma.profile.upsert({
      where: { userId },
      update: { timeZone: input.timeZone },
      create: { userId, timeZone: input.timeZone },
    });
  }
}

export async function unregisterPushToken(prisma: PrismaClient, userId: string, token: string): Promise<void> {
  // Scoped to the user so one account cannot delete another's token.
  await prisma.pushToken.deleteMany({ where: { token, userId } });
}
