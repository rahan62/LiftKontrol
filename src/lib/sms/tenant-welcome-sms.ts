import "server-only";

import { normalizeTrGsmForNetgsm } from "@/lib/sms/phone-tr";
import { sendNetgsmSms } from "@/lib/sms/netgsm-send";

const COMPANY_NAME_MAX = 72;

function truncateCompanyName(name: string): string {
  const t = name.trim();
  if (t.length <= COMPANY_NAME_MAX) return t;
  return `${t.slice(0, COMPANY_NAME_MAX - 1)}…`;
}

/** Yeni kiracı kaydı sonrası Netgsm ile gönderilir (işlem başarısını engellemez). */
export function buildTenantWelcomeSmsBody(companyName: string): string {
  const n = truncateCompanyName(companyName);
  return `Merhaba, ${n}, Lift Kontrol hesabınız başarıyla oluşturulmuştur. Aramıza hoş geldiniz!`;
}

export async function sendTenantWelcomeSmsBestEffort(companyName: string, phoneE164: string): Promise<void> {
  const msisdn = normalizeTrGsmForNetgsm(phoneE164);
  if (!msisdn) return;
  const body = buildTenantWelcomeSmsBody(companyName);
  await sendNetgsmSms(msisdn, body);
}
