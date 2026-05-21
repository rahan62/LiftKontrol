import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  Building2,
  Calculator,
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
  Wrench,
} from "lucide-react";
import { tr } from "@/lib/i18n/tr";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type AppNavSection = {
  heading: string;
  items: AppNavItem[];
};

/** Bölüm başlıkları + sıra — kenar çubuğu ve mobil menü için tek kaynak. */
export const appNavSections: AppNavSection[] = [
  {
    heading: tr.nav.sectionOverview,
    items: [{ href: "/app", label: tr.nav.dashboard, icon: LayoutDashboard }],
  },
  {
    heading: tr.nav.sectionCustomerFlow,
    items: [
      { href: "/app/customers", label: tr.nav.customers, icon: Users },
      { href: "/app/sites", label: tr.nav.sites, icon: MapPin },
      { href: "/app/assets", label: tr.nav.assets, icon: Building2 },
    ],
  },
  {
    heading: tr.nav.sectionFinance,
    items: [
      { href: "/app/accounting", label: tr.nav.accounting, icon: Calculator },
      { href: "/app/contracts", label: tr.nav.contracts, icon: FileText },
    ],
  },
  {
    heading: tr.nav.sectionTechnical,
    items: [
      { href: "/app/maintenance", label: tr.nav.maintenance, icon: ClipboardList },
      { href: "/app/revision-articles", label: tr.nav.revisionArticles, icon: BookMarked },
      { href: "/app/periodic-controls", label: tr.nav.periodicControls, icon: ClipboardCheck },
      { href: "/app/revisions", label: tr.nav.revisions, icon: Layers },
    ],
  },
  {
    heading: tr.nav.sectionFieldOps,
    items: [
      { href: "/app/work-orders", label: tr.nav.workOrders, icon: Wrench },
      { href: "/app/callbacks", label: tr.nav.callbacks, icon: PhoneCall },
      { href: "/app/projects", label: tr.nav.projects, icon: Factory },
      { href: "/app/schedule", label: tr.nav.schedule, icon: Truck },
      { href: "/app/stock", label: tr.nav.stock, icon: Package },
    ],
  },
  {
    heading: tr.nav.sectionInsight,
    items: [
      { href: "/app/quotations", label: tr.nav.quotations, icon: FileText },
      { href: "/app/reports", label: tr.nav.reports, icon: Gauge },
      { href: "/app/documents", label: tr.nav.documents, icon: FileText },
    ],
  },
  {
    heading: tr.nav.sectionCompany,
    items: [{ href: "/app/settings", label: tr.nav.settings, icon: Settings }],
  },
];

/** Düz liste (sıra korunur) — kod veya başka paket referansları için. */
export const appNavItems: AppNavItem[] = appNavSections.flatMap((s) => s.items);
