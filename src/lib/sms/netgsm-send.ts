import "server-only";

import Netgsm, { SendSmsErrorCode } from "@netgsm/sms";
import { getNetgsmEnv } from "@/lib/sms/netgsm-env";

export type NetgsmSendResult =
  | { ok: true; jobid?: string }
  | { ok: false; code: string; description: string };

/** @netgsm/sms başarısız yanıtta Error değil düz nesne fırlatır (`code`, `description`). */
function describeNetgsmCatch(e: unknown): NetgsmSendResult {
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    const code = o.code != null ? String(o.code) : null;
    const desc =
      (typeof o.description === "string" && o.description) ||
      (typeof o.message === "string" && o.message) ||
      null;
    const http = o.status != null ? ` HTTP ${String(o.status)}` : "";
    if (code || desc) {
      return {
        ok: false,
        code: code ?? "sdk",
        description: `${desc ?? "Netgsm yanıtı"}${http}`.trim(),
      };
    }
  }
  if (e instanceof Error) {
    return { ok: false, code: "exception", description: e.message };
  }
  try {
    return { ok: false, code: "exception", description: String(e) };
  } catch {
    return { ok: false, code: "exception", description: "Bilinmeyen Netgsm hatası" };
  }
}

/** Tek alıcıya SMS (REST v2 — resmi [@netgsm/sms](https://github.com/netgsm/netgsm-sms-js)). */
export async function sendNetgsmSms(phone10: string, message: string): Promise<NetgsmSendResult> {
  const env = getNetgsmEnv();
  if (!env) {
    return { ok: false, code: "config", description: "NETGSM_USERNAME / NETGSM_PASSWORD / NETGSM_MSG_HEADER eksik" };
  }
  const client = new Netgsm({
    username: env.username,
    password: env.password,
    ...(env.appname ? { appname: env.appname } : {}),
  });
  try {
    const res = await client.sendRestSms({
      msgheader: env.msgheader,
      encoding: "TR",
      messages: [{ msg: message, no: phone10 }],
      ...(env.appname ? { appname: env.appname } : {}),
    });
    if (res.code === SendSmsErrorCode.SUCCESS) {
      return { ok: true, jobid: res.jobid };
    }
    return { ok: false, code: String(res.code), description: res.description || "Netgsm hata" };
  } catch (e) {
    return describeNetgsmCatch(e);
  }
}
