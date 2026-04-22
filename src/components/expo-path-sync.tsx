"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
  }
}

/** Lets the Expo react-native-webview shell track App Router navigations (soft navigations). */
export function ExpoPathSync() {
  const pathname = usePathname();

  useEffect(() => {
    const w = window.ReactNativeWebView;
    if (!w?.postMessage) return;
    w.postMessage(JSON.stringify({ type: "pathname", p: pathname }));
  }, [pathname]);

  return null;
}
