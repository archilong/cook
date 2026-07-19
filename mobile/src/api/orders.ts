import { CookingOrder, CookingOrderCancel, CookingOrderCreate, CookingOrderReminderUpdate } from "@/features/orders/types";

import { apiGet, apiPatch, apiPost } from "./client";

export function listFamilyOrders(familyId: number): Promise<CookingOrder[]> {
  return apiGet<CookingOrder[]>(`/families/${familyId}/orders`, { auth: true });
}

export function createFamilyOrder(familyId: number, request: CookingOrderCreate): Promise<CookingOrder> {
  return apiPost<CookingOrder>(`/families/${familyId}/orders`, request, { auth: true });
}

export function listMyOrders(): Promise<CookingOrder[]> {
  return apiGet<CookingOrder[]>("/orders", { auth: true });
}

export function getOrder(orderId: number): Promise<CookingOrder> {
  return apiGet<CookingOrder>(`/orders/${orderId}`, { auth: true });
}

export function acceptOrder(orderId: number): Promise<CookingOrder> {
  return apiPost<CookingOrder>(`/orders/${orderId}/accept`, undefined, { auth: true });
}

export function completeOrder(orderId: number): Promise<CookingOrder> {
  return apiPost<CookingOrder>(`/orders/${orderId}/complete`, undefined, { auth: true });
}

export function cancelOrder(orderId: number, request: CookingOrderCancel): Promise<CookingOrder> {
  return apiPost<CookingOrder>(`/orders/${orderId}/cancel`, request, { auth: true });
}

export function updateOrderReminder(orderId: number, request: CookingOrderReminderUpdate): Promise<CookingOrder> {
  return apiPatch<CookingOrder>(`/orders/${orderId}/reminder`, request, { auth: true });
}
