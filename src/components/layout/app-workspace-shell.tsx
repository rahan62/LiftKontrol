"use client";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { signOutClient } from "@/lib/auth/sign-out-client";
import { BrandLogo } from "@/components/layout/brand-logo";
import { appNavItems } from "@/components/layout/app-nav-config";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n/tr";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const EXPO_SHELL_COOKIE = "expo_shell_cmd";
const SK_MENU = "expo_shell_menu_pending";
const SK_SIGNOUT = "expo_shell_signout_pending";

function readExpoShellCookie(): string | null {
  if (typeof document === "undefined" || !document.cookie) return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${EXPO_SHELL_COOKIE}=([^;]*)`));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function clearExpoShellCookie() {
  document.cookie = `${EXPO_SHELL_COOKIE}=; path=/; max-age=0`;
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-2">
      {appNavItems.map((item) => {
        const active =
          item.href === "/app"
            ? pathname === "/app"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors lg:min-h-0 lg:gap-2 lg:px-2 lg:py-1.5",
              active
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-900 hover:text-white",
            )}
          >
            <Icon className="h-5 w-5 shrink-0 opacity-80 lg:h-4 lg:w-4" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function BrandHeader() {
  return (
    <div className="border-b border-slate-800 px-4 py-4">
      <Link
        href="/app"
        className="inline-block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
      >
        <BrandLogo height={48} priority className="max-w-[11rem]" />
      </Link>
      <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{tr.brand.fieldService}</div>
      <div className="mt-0.5 text-sm font-semibold text-white">{tr.brand.appName}</div>
    </div>
  );
}

export function AppWorkspaceShell({
  tenantLine,
  children,
}: {
  tenantLine: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  /** Only close the drawer on real route changes — not on initial mount (avoids racing Expo ?__expo_cmd=menu). */
  const prevPathname = useRef<string | null>(null);
  /** Avoid running the same Expo command in both useLayoutEffect and useEffect on one mount. */
  const expoShellCmdHandledRef = useRef(false);

  useEffect(() => {
    if (prevPathname.current === null) {
      prevPathname.current = pathname;
      return;
    }
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      setMobileOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  /**
   * Expo shell: middleware redirects ?__expo_cmd= → clean URL + `expo_shell_cmd` cookie.
   * React Strict Mode remount loses `mobileOpen` after the cookie is cleared — we set sessionStorage
   * when reading the cookie so the second mount can still open the menu / run sign-out.
   * `useEffect` catches cookies that appear slightly after `useLayoutEffect` (WKWebView timing).
   */
  const runExpoShellCommand = (isDeferredPass: boolean) => {
    if (isDeferredPass && expoShellCmdHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    let cmd = params.get("__expo_cmd");

    if (!cmd) {
      const c = readExpoShellCookie();
      if (c === "menu" || c === "signout") {
        if (typeof sessionStorage !== "undefined") {
          if (c === "menu") sessionStorage.setItem(SK_MENU, "1");
          else sessionStorage.setItem(SK_SIGNOUT, "1");
        }
        cmd = c;
        clearExpoShellCookie();
      }
    }

    if (!cmd && typeof sessionStorage !== "undefined") {
      if (sessionStorage.getItem(SK_MENU) === "1") {
        cmd = "menu";
        sessionStorage.removeItem(SK_MENU);
      } else if (sessionStorage.getItem(SK_SIGNOUT) === "1") {
        cmd = "signout";
        sessionStorage.removeItem(SK_SIGNOUT);
      }
    }

    if (!cmd) return;

    expoShellCmdHandledRef.current = true;

    if (cmd === "menu") {
      setMobileOpen(true);
      setTimeout(() => {
        try {
          sessionStorage.removeItem(SK_MENU);
        } catch {
          /* ignore */
        }
      }, 600);
      if (params.has("__expo_cmd")) {
        params.delete("__expo_cmd");
        params.delete("_t");
        const q = params.toString();
        const clean = `${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash || ""}`;
        window.history.replaceState(null, "", clean);
      }
      return;
    }

    if (cmd === "signout") {
      setTimeout(() => {
        try {
          sessionStorage.removeItem(SK_SIGNOUT);
        } catch {
          /* ignore */
        }
      }, 600);
      if (params.has("__expo_cmd")) {
        params.delete("__expo_cmd");
        params.delete("_t");
        const q = params.toString();
        const clean = `${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash || ""}`;
        window.history.replaceState(null, "", clean);
      }
      void (async () => {
        try {
          await signOutClient();
        } finally {
          window.location.replace(`${window.location.origin}/login`);
        }
      })();
    }
  };

  useLayoutEffect(() => {
    runExpoShellCommand(false);
  }, []);

  useEffect(() => {
    runExpoShellCommand(true);
  }, []);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-slate-200 lg:flex">
        <BrandHeader />
        <NavLinks pathname={pathname} />
        <div className="border-t border-slate-800 p-3 text-[11px] text-slate-500">{tr.brand.footer}</div>
      </aside>

      {/* Only mount when open — a closed full-screen fixed layer breaks taps in some embedded WebViews. */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[100] flex lg:hidden" aria-hidden={false}>
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-label={tr.layout.closeMenu}
          />
          <aside
            className="relative flex h-full w-[min(20rem,92vw)] flex-col border-r border-slate-800 bg-slate-950 text-slate-200 shadow-xl"
            id="mobile-app-nav"
            role="dialog"
            aria-modal="true"
            aria-label={tr.layout.menu}
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 px-3 py-3 pr-2">
              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                <BrandLogo height={40} className="shrink-0" />
                <div className="min-w-0 pt-0.5">
                  <div className="text-xs font-semibold uppercase text-slate-500">{tr.brand.fieldService}</div>
                  <div className="truncate text-sm font-semibold text-white">{tr.brand.appName}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex shrink-0 rounded-md p-2 text-slate-400 hover:bg-slate-900 hover:text-white"
                aria-label={tr.layout.closeMenu}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            <div className="border-t border-slate-800 p-3 text-[11px] text-slate-500">{tr.brand.footer}</div>
          </aside>
        </div>
      ) : null}

      {/*
        Put the workspace bar inside the same overflow-y-auto scroller as the page. In embedded
        WebViews (Expo), WKWebView often delivers taps only to the main scrollable layer; a sibling
        flex row above that layer can look fine but never receive touches, while in-flow content below
        works. Sticky keeps the bar visible while the pane scrolls.
      */}
      <div className="isolate flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          <header
            id="workspace-chrome-bar"
            className={cn(
              "sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:px-4",
              "touch-manipulation [-webkit-tap-highlight-color:transparent]",
            )}
          >
            <button
              type="button"
              className="touch-manipulation relative z-10 select-none inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200 lg:min-h-0 lg:min-w-0 lg:hidden dark:text-slate-200 dark:hover:bg-slate-900 dark:active:bg-slate-800"
              onClick={() => setMobileOpen(true)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-app-nav"
              aria-label={tr.layout.openMenu}
            >
              <Menu className="pointer-events-none h-6 w-6" />
            </button>
            <span className="relative z-10 mr-auto min-w-0 truncate text-xs text-slate-500 sm:text-sm">
              {tenantLine}
            </span>
            <div className="relative z-10 shrink-0">
              <SignOutButton />
            </div>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
