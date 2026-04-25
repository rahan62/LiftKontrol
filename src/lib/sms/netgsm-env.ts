import "server-only";

export type NetgsmEnv = {
  username: string;
  password: string;
  msgheader: string;
  appname?: string;
};

export function getNetgsmEnv(): NetgsmEnv | null {
  const username = process.env.NETGSM_USERNAME?.trim();
  const password = process.env.NETGSM_PASSWORD?.trim();
  const msgheader = process.env.NETGSM_MSG_HEADER?.trim();
  const appname = process.env.NETGSM_APPNAME?.trim();
  if (!username || !password || !msgheader) return null;
  return { username, password, msgheader, ...(appname ? { appname } : {}) };
}
