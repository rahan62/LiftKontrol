import { SiteForm } from "@/components/forms/site-form";
import { listCustomers } from "@/lib/data/customers";
import { getTenantContext } from "@/lib/tenant/server";
import { redirect } from "next/navigation";

export default async function NewSitePage({
  searchParams,
}: {
  searchParams: Promise<{ customer_id?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const customers = await listCustomers(ctx.tenantId);
  const options = customers.map((c) => ({ id: c.id, legal_name: c.legal_name }));

  return (
    <SiteForm mode="create" customers={options} defaultCustomerId={sp.customer_id} />
  );
}
