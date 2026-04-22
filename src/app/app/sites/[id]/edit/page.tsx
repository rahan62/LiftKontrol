import { SiteForm } from "@/components/forms/site-form";
import { listCustomers } from "@/lib/data/customers";
import { getSite } from "@/lib/data/sites";
import { getTenantContext } from "@/lib/tenant/server";
import { notFound, redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function EditSitePage({ params }: Props) {
  const { id } = await params;
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const site = await getSite(ctx.tenantId, id);
  if (!site) notFound();

  const customers = await listCustomers(ctx.tenantId);
  const options = customers.map((c) => ({ id: c.id, legal_name: c.legal_name }));

  const svc = site.service_address as Record<string, string> | null;
  const geoRaw = site.geo as Record<string, unknown> | null | undefined;
  const geoLatRaw = geoRaw?.lat ?? geoRaw?.latitude;
  const geoLngRaw = geoRaw?.lng ?? geoRaw?.longitude ?? geoRaw?.lon;
  const geo_lat =
    geoLatRaw !== undefined && geoLatRaw !== null ? String(geoLatRaw) : undefined;
  const geo_lng =
    geoLngRaw !== undefined && geoLngRaw !== null ? String(geoLngRaw) : undefined;

  return (
    <SiteForm
      mode="edit"
      siteId={id}
      customers={options}
      initial={{
        customer_id: String(site.customer_id ?? ""),
        name: String(site.name ?? ""),
        service_address: svc
          ? {
              line1: svc.line1,
              city: svc.city,
              region: svc.region,
              postal_code: svc.postal_code,
              country: svc.country,
            }
          : null,
        billing_same_as_service: Boolean(site.billing_same_as_service),
        access_instructions: site.access_instructions ? String(site.access_instructions) : null,
        machine_room_notes: site.machine_room_notes ? String(site.machine_room_notes) : null,
        shaft_notes: site.shaft_notes ? String(site.shaft_notes) : null,
        emergency_phones: site.emergency_phones ? String(site.emergency_phones) : null,
        maintenance_notes: site.maintenance_notes ? String(site.maintenance_notes) : null,
        geo_lat,
        geo_lng,
      }}
    />
  );
}
