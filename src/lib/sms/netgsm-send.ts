import "server-only";

import Netgsm, { SendSmsErrorCode } from "@netgsm/sms";
import { getNetgsmEnv } from "@/lib/sms/netgsm-env";

export type NetgsmSendResult =
  | { ok: true; jobid?: string }
  | { ok: false; code: string; description: string };

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
    const msg = e instanceof Error ? e.message : "Bilinmeyen Netgsm hatası";
    return { ok: false, code: "exception", description: msg };
  }
}
