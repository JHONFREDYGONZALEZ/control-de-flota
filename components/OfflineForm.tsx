'use client';

import { useRouter } from 'next/navigation';
import { enqueue } from '@/lib/offline/sync';
import { ACTIONS, type ActionKey } from '@/lib/offline/registry';

export default function OfflineForm({
  action,
  label,
  redirectTo,
  redirectToVehicle,
  className,
  children,
}: {
  action: ActionKey;
  label: string;
  redirectTo?: string;
  redirectToVehicle?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function submit(formData: FormData) {
    try {
      await enqueue(action, label, formData);
    } catch {
      // sin almacenamiento local disponible: se envía directo (requiere conexión)
      await ACTIONS[action](formData);
    }
    if (redirectToVehicle) router.push(`/vehicles/${String(formData.get('vehicleId'))}`);
    else if (redirectTo) router.push(redirectTo);
  }

  return (
    <form action={submit} className={className}>
      {children}
    </form>
  );
}
