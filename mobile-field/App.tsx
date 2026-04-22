import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import WebView from "react-native-webview";

/** Set in `.env` — must be reachable from the phone (LAN IP or HTTPS URL), not localhost. */
const WEB_URL = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim();

const EXPO_SHELL_MARK = `
(function () {
  try {
    document.documentElement.setAttribute("data-expo-shell", "1");
  } catch (e) {}
  true;
})();
`;

/** Full navigation with query — works when injectJavaScript / postMessage are ignored by WKWebView. */
function webviewUriWithExpoCmd(currentUrl: string, webUrl: string, cmd: "menu" | "signout"): string {
  let base: string;
  try {
    const u = new URL(currentUrl);
    if (u.protocol === "http:" || u.protocol === "https:") {
      base = currentUrl;
    } else {
      base = webUrl;
    }
  } catch {
    base = webUrl;
  }
  const u = new URL(base);
  u.searchParams.set("__expo_cmd", cmd);
  u.searchParams.set("_t", String(Date.now()));
  return u.toString();
}

function isAppWorkspacePath(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    const p = u.pathname.replace(/\/$/, "") || "/";
    return p === "/app" || p.startsWith("/app/");
  } catch {
    return false;
  }
}

/** Native back only after the user leaves dashboard (not on /app, login, or marketing home). */
function pathAllowsNativeBack(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    const p = u.pathname.replace(/\/$/, "") || "/";
    if (p === "/app") return false;
    if (p === "/" || p === "") return false;
    if (p.startsWith("/login") || p.startsWith("/signup") || p.startsWith("/auth")) return false;
    return true;
  } catch {
    return false;
  }
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(WEB_URL ?? "");
  const [sourceUri, setSourceUri] = useState(WEB_URL ?? "");
  const webRef = useRef<WebView>(null);
  /** Only sync `source={{ uri }}` to WKWebView’s URL after native Menü/Çıkış — not on every nav event (reload storm). */
  const alignWebSourceAfterNativeCmd = useRef(false);

  const allowBack = useMemo(
    () => canGoBack && pathAllowsNativeBack(currentUrl),
    [canGoBack, currentUrl],
  );

  const markExpoShell = useCallback(() => {
    webRef.current?.injectJavaScript(EXPO_SHELL_MARK);
  }, []);

  const onNavigationStateChange = useCallback(
    (nav: { canGoBack?: boolean; url?: string }) => {
      setCanGoBack(Boolean(nav.canGoBack));
      if (typeof nav.url !== "string" || !WEB_URL) return;
      let href = nav.url;
      if (!href.startsWith("http")) {
        try {
          href = new URL(href, WEB_URL).href;
        } catch {
          return;
        }
      }
      setCurrentUrl(href);
      if (!alignWebSourceAfterNativeCmd.current) return;
      setSourceUri(href);
      try {
        if (!new URL(href).searchParams.has("__expo_cmd")) {
          alignWebSourceAfterNativeCmd.current = false;
        }
      } catch {
        alignWebSourceAfterNativeCmd.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (allowBack && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [allowBack]);

  if (!WEB_URL) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.centered}>
          <Text style={styles.title}>EXPO_PUBLIC_WEB_APP_URL missing</Text>
          <Text style={styles.body}>
            Add mobile-field/.env with e.g.{"\n\n"}
            EXPO_PUBLIC_WEB_APP_URL=http://192.168.1.12:3000{"\n\n"}
            Use your Mac&apos;s Wi‑Fi IP (not localhost). Restart Expo after changing .env.
          </Text>
          <StatusBar style="auto" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const showWorkspaceChrome = isAppWorkspacePath(currentUrl);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.flex} edges={["top"]}>
        {/* box-none: only the Pressable takes touches; the row does not block the WebView below */}
        {allowBack ? (
          <View style={styles.chrome} pointerEvents="box-none">
            <Pressable
              onPress={() => webRef.current?.goBack()}
              style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Geri"
            >
              <Text style={styles.backLabel}>‹ Geri</Text>
            </Pressable>
          </View>
        ) : null}
        {showWorkspaceChrome ? (
          <View style={styles.workspaceBar} accessibilityRole="toolbar">
            <Pressable
              onPress={() => {
                if (!WEB_URL) return;
                alignWebSourceAfterNativeCmd.current = true;
                setSourceUri(webviewUriWithExpoCmd(currentUrl || WEB_URL, WEB_URL, "menu"));
              }}
              style={({ pressed }) => [styles.workspaceBtn, pressed && styles.workspaceBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Menüyü aç"
            >
              <Text style={styles.workspaceBtnLabel}>☰ Menü</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!WEB_URL) return;
                alignWebSourceAfterNativeCmd.current = true;
                setSourceUri(webviewUriWithExpoCmd(currentUrl || WEB_URL, WEB_URL, "signout"));
              }}
              style={({ pressed }) => [styles.workspaceBtn, pressed && styles.workspaceBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Çıkış"
            >
              <Text style={styles.workspaceBtnLabel}>Çıkış</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.webWrap} collapsable={false}>
          <WebView
            ref={webRef}
            source={{ uri: sourceUri }}
            style={styles.webview}
            injectedJavaScriptBeforeContentLoaded={EXPO_SHELL_MARK}
            onLoadEnd={() => {
              setLoading(false);
              markExpoShell();
            }}
            onError={() => setLoading(false)}
            onNavigationStateChange={onNavigationStateChange}
            onMessage={(e) => {
              try {
                const d = JSON.parse(e.nativeEvent.data) as { type?: string; p?: string };
                if (d.type === "pathname" && typeof d.p === "string" && WEB_URL) {
                  const origin = new URL(WEB_URL).origin;
                  const path = d.p.startsWith("/") ? d.p : `/${d.p}`;
                  const full = `${origin}${path}`;
                  setCurrentUrl(full);
                }
              } catch {
                /* ignore */
              }
            }}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            originWhitelist={["*"]}
            cacheEnabled
            allowsBackForwardNavigationGestures
            nestedScrollEnabled
          />
        </View>
        {loading ? (
          <View style={styles.overlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#334155" />
          </View>
        ) : null}
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  /** Android: keep this node in the native layer so flex sizing / hit-testing stay stable. */
  webWrap: { flex: 1, alignSelf: "stretch" },
  webview: { flex: 1, backgroundColor: "#fff" },
  chrome: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  backBtnPressed: { opacity: 0.6 },
  backLabel: { fontSize: 17, color: "#0f172a", fontWeight: "500" },
  workspaceBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  workspaceBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  workspaceBtnPressed: { opacity: 0.65 },
  workspaceBtnLabel: { fontSize: 16, color: "#0f172a", fontWeight: "600" },
  centered: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: { fontSize: 17, fontWeight: "600", marginBottom: 12, textAlign: "center" },
  body: { fontSize: 14, color: "#475569", textAlign: "center", lineHeight: 22 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
  },
});
