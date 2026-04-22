import { CustomerForm } from "@/components/forms/customer-form";
import { getTenantContext } from "@/lib/tenant/server";
import { redirect } from "next/navigation";

export default async function NewCustomerPage() {
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) {
    redirect("/app/onboarding");
  }

  return <CustomerForm mode="create" />;
}
