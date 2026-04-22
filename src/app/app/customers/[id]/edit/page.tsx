import { CustomerForm } from "@/components/forms/customer-form";
import { getCustomer } from "@/lib/data/customers";
import { getTenantContext } from "@/lib/tenant/server";
import { notFound, redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function EditCustomerPage({ params }: Props) {
  const { id } = await params;
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const row = await getCustomer(ctx.tenantId, id);
  if (!row) notFound();

  const billing = row.billing_address as Record<string, string> | null;

  return (
    <CustomerForm
      mode="edit"
      customerId={id}
      initial={{
        legal_name: String(row.legal_name ?? ""),
        code: row.code ? String(row.code) : null,
        status: String(row.status ?? "active"),
        notes: row.notes ? String(row.notes) : null,
        billing_address: billing
          ? {
              line1: billing.line1,
              city: billing.city,
              region: billing.region,
              postal_code: billing.postal_code,
              country: billing.country,
            }
          : null,
      }}
    />
  );
}
