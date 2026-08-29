const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Expo caps a single request at 100 messages. */
const MAX_BATCH = 100;

const REQUEST_TIMEOUT_MS = 10_000;

export interface PushMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PushResult {
  /** Tokens Expo says are no longer valid — the caller should delete them. */
  invalidTokens: string[];
  sent: number;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

/**
 * Sends notifications through Expo's push service.
 *
 * No SDK dependency: this is one HTTP POST, and the one thing that genuinely
 * matters — pruning tokens Expo reports as dead — is a few lines. An
 * unpruned token list grows forever and every send wastes a slot on a device
 * that uninstalled months ago.
 */
export class ExpoPushProvider {
  async send(messages: PushMessage[]): Promise<PushResult> {
    const invalidTokens: string[] = [];
    let sent = 0;

    for (let i = 0; i < messages.length; i += MAX_BATCH) {
      const batch = messages.slice(i, i + MAX_BATCH);
      const tickets = await this.postBatch(batch);

      tickets.forEach((ticket, index) => {
        if (ticket.status === 'ok') {
          sent += 1;
          return;
        }
        // DeviceNotRegistered means the app was uninstalled or the token was
        // rotated — the only ticket error worth acting on automatically.
        if (ticket.details?.error === 'DeviceNotRegistered') {
          invalidTokens.push(batch[index].token);
        }
      });
    }

    return { invalidTokens, sent };
  }

  private async postBatch(batch: PushMessage[]): Promise<ExpoTicket[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(
          batch.map((m) => ({
            to: m.token,
            title: m.title,
            body: m.body,
            data: m.data,
            sound: 'default',
            channelId: 'reminders',
          })),
        ),
        signal: controller.signal,
      });

      if (!response.ok) {
        // A failed batch is not fatal: the reminder is already claimed for
        // today, so it is skipped rather than retried into a duplicate.
        return batch.map(() => ({ status: 'error' as const, message: `HTTP ${response.status}` }));
      }

      const payload = (await response.json()) as { data?: ExpoTicket[] };
      return payload.data ?? batch.map(() => ({ status: 'error' as const }));
    } catch {
      return batch.map(() => ({ status: 'error' as const }));
    } finally {
      clearTimeout(timeout);
    }
  }
}
