import { AssetForm } from "@/components/forms/asset-form";
import { DEFAULT_ELEVATOR_TYPE } from "@/lib/domain/elevator-types";
import { getAssetWithSiteCustomer } from "@/lib/data/assets";
import { listCustomers } from "@/lib/data/customers";
import { listSitesForCustomer } from "@/lib/data/sites";
import { getTenantContext } from "@/lib/tenant/server";
import { notFound, redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function EditAssetPage({ params }: Props) {
  const { id } = await params;
  const ctx = await getTenantContext();
  if (!ctx?.tenantId) redirect("/app/onboarding");

  const row = await getAssetWithSiteCustomer(ctx.tenantId, id);
  if (!row) notFound();

  const { asset } = row;
  const customers = await listCustomers(ctx.tenantId);
  const options = customers.map((c) => ({ id: c.id, legal_name: c.legal_name }));

  const sites = await listSitesForCustomer(ctx.tenantId, String(asset.customer_id));

  return (
    <AssetForm
      mode="edit"
      assetId={id}
      customers={options}
      initialSites={sites}
      initial={{
        customer_id: String(asset.customer_id),
        site_id: String(asset.site_id),
        unit_code: String(asset.unit_code ?? ""),
        elevator_type: String(asset.elevator_type ?? DEFAULT_ELEVATOR_TYPE),
        brand: asset.brand ? String(asset.brand) : null,
        model: asset.model ? String(asset.model) : null,
        serial_number: asset.serial_number ? String(asset.serial_number) : null,
        controller_type: asset.controller_type ? String(asset.controller_type) : null,
        drive_type: asset.drive_type ? String(asset.drive_type) : null,
        door_type: asset.door_type ? String(asset.door_type) : null,
        stops: num(asset.stops),
        capacity_kg: num(asset.capacity_kg),
        persons: num(asset.persons),
        speed: num(asset.speed),
        operational_status: String(asset.operational_status ?? "in_service"),
        unsafe_flag: Boolean(asset.unsafe_flag),
        en8120_control_authority: asset.en8120_control_authority
          ? String(asset.en8120_control_authority)
          : null,
        private_control_company_name: asset.private_control_company_name
          ? String(asset.private_control_company_name)
          : null,
        en8120_next_control_due: asset.en8120_next_control_due
          ? String(asset.en8120_next_control_due).slice(0, 10)
          : null,
        maintenance_transfer_basis: asset.maintenance_transfer_basis
          ? String(asset.maintenance_transfer_basis)
          : null,
        maintenance_fee: num(asset.maintenance_fee),
        maintenance_fee_period: asset.maintenance_fee_period
          ? String(asset.maintenance_fee_period)
          : null,
      }}
    />
  );
}
