/** Ortam değişkeni `0` ise ilgili otomatik SMS enqueue devre dışı (varsayılan: açık). */

export function smsMaintenanceEnqueueEnabled(): boolean {
  return process.env.SMS_MAINTENANCE_ENQUEUE_ENABLED?.trim() !== "0";
}

export function smsMonthlyCariEnqueueEnabled(): boolean {
  return process.env.SMS_MONTHLY_CARI_ENQUEUE_ENABLED?.trim() !== "0";
}
