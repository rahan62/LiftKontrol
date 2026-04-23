/** Must match public.tenant_members.system_role check constraint. */
export const TENANT_SYSTEM_ROLES = [
  "tenant_owner",
  "company_admin",
  "dispatcher",
  "service_manager",
  "technician",
  "warehouse_manager",
  "finance",
  "sales_quotation",
  "customer_support_readonly",
  "customer_portal_user",
] as const;

export type TenantSystemRole = (typeof TENANT_SYSTEM_ROLES)[number];

export const TENANT_ROLE_LABELS: Record<TenantSystemRole, string> = {
  tenant_owner: "Firma sahibi",
  company_admin: "Şirket yöneticisi",
  dispatcher: "Dispetçer",
  service_manager: "Servis müdürü",
  technician: "Teknisyen",
  warehouse_manager: "Depo",
  finance: "Finans",
  sales_quotation: "Satış / teklif",
  customer_support_readonly: "Destek (salt okunur)",
  customer_portal_user: "Portal kullanıcısı",
};
