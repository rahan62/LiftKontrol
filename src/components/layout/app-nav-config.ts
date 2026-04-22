import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Factory,
  FileText,
  Gauge,
  Layers,
  LayoutDashboard,
  MapPin,
  Package,
  PhoneCall,
  Settings,
  Truck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { tr } from "@/lib/i18n/tr";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Single source for desktop sidebar + mobile drawer. */
export const appNavItems: AppNavItem[] = [
  { href: "/app", label: tr.nav.dashboard, icon: LayoutDashboard },
  { href: "/app/customers", label: tr.nav.customers, icon: Users },
  { href: "/app/finances", label: tr.nav.finances, icon: Wallet },
  { href: "/app/sites", label: tr.nav.sites, icon: MapPin },
  { href: "/app/assets", label: tr.nav.assets, icon: Building2 },
  { href: "/app/contracts", label: tr.nav.contracts, icon: FileText },
  { href: "/app/maintenance", label: tr.nav.maintenance, icon: ClipboardList },
  { href: "/app/revision-articles", label: tr.nav.revisionArticles, icon: BookMarked },
  { href: "/app/periodic-controls", label: tr.nav.periodicControls, icon: ClipboardCheck },
  { href: "/app/revisions", label: tr.nav.revisions, icon: Layers },
  { href: "/app/work-orders", label: tr.nav.workOrders, icon: Wrench },
  { href: "/app/callbacks", label: tr.nav.callbacks, icon: PhoneCall },
  { href: "/app/projects", label: tr.nav.projects, icon: Factory },
  { href: "/app/schedule", label: tr.nav.schedule, icon: Truck },
  { href: "/app/stock", label: tr.nav.stock, icon: Package },
  { href: "/app/quotations", label: tr.nav.quotations, icon: FileText },
  { href: "/app/reports", label: tr.nav.reports, icon: Gauge },
  { href: "/app/documents", label: tr.nav.documents, icon: FileText },
  { href: "/app/settings", label: tr.nav.settings, icon: Settings },
];
