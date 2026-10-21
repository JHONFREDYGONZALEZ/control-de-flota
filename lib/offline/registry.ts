import { registerKm, generateWorkOrder, updateWorkOrder, approveWorkOrder, invoiceWorkOrder } from '@/app/actions';
import {
  updateDocument,
  addCustomDocument,
  updateMaintenanceItem,
  addCustomMaintenanceItem,
  addDelivery,
  updateDeliveryPhotos,
} from '@/app/vehicles/[id]/actions';
import { addDeliveryFromDashboard } from '@/app/deliveries/new/actions';
import { generateWorkOrderFromDashboard } from '@/app/work-orders/new/actions';
import { addProvider, updateProvider } from '@/app/providers/actions';

export const ACTIONS = {
  registerKm,
  generateWorkOrder,
  updateWorkOrder,
  approveWorkOrder,
  invoiceWorkOrder,
  updateDocument,
  addCustomDocument,
  updateMaintenanceItem,
  addCustomMaintenanceItem,
  addDelivery,
  updateDeliveryPhotos,
  addDeliveryFromDashboard,
  generateWorkOrderFromDashboard,
  addProvider,
  updateProvider,
} satisfies Record<string, (formData: FormData) => Promise<void>>;

export type ActionKey = keyof typeof ACTIONS;
