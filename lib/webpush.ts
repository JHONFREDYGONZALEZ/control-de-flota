import webpush from 'web-push';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error('Faltan las claves VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)');
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:soporte@example.com',
    publicKey,
    privateKey
  );
  configured = true;
}

export async function sendPushToSubscriptions(
  subscriptions: { endpoint: string; p256dh: string; auth: string; id: string }[],
  payload: { title: string; body: string; url?: string },
  onInvalid?: (id: string) => void
) {
  ensureConfigured();
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        // 404/410 = esa suscripción ya no existe (desinstaló, cambió de celular, etc.)
        if ((err?.statusCode === 404 || err?.statusCode === 410) && onInvalid) {
          onInvalid(sub.id);
        }
      }
    })
  );
}
