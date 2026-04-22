# Şema özeti — web / iOS / Android hizalama

Kaynak: `supabase/migrations/*.sql` (tek doğruluk kaynağı). RLS: çoğu tabloda `tenant_id in (select public.current_tenant_ids())`.

## Migrasyon sırası

| Dosya | Amaç |
|--------|------|
| `20250325000000_local_postgres_prereq` | Yalnız **yerel Postgres**: sahte `auth` şeması + `auth.uid()` → NULL. **Supabase’te çalıştırılmaz** (`migrate.cjs` atlar). iOS/web her zaman gerçek Supabase Auth. |
| `20250326000000_initial_schema` | Çok kiracılı çekirdek: CRM, asansör, iş emri, stok, teklif, bakım planı, RLS, `tenant_members.system_role`. |
| `20250327000000_site_maintenance_finance` | `sites`: kat/asansör sayısı, **bakım ücreti** dönemi; `finance_entries` (site **veya** asansör, tek scope). |
| `20250329000000_maintenance_parts_stock_contracts` | `sites.management_type` (resident / management_company); `elevator_monthly_maintenance` (asansör × ay); `service_parts_usage` + stok genişlemesi; sözleşme dosya yolu. |
| `20250329120000_en8120_revision_monthly_checklist` | Asansörde EN 81-20 yetki, sonraki kontrol, devralma; `revision_articles`; aylık ziyaret **checklist JSON**. |
| `20250330120000_periodic_controls_revisions_logo` | `periodic_controls` (form dosyası); `elevator_revisions` + satırlar; `tenants.logo_path`. |
| `20250330140000_periodic_alerts_revision_workflow_tickets` | Madde **bant** (yeşil/mavi/sarı/kırmızı); kontrol **durumu**; revizyon onay / plan / final tetik. |

## Varlık hiyerarşisi (CRM → saha → asansör)

```
tenants
  └── customers (hukuki müşteri: yönetim şirketi, kamu birimi, vb.)
        └── sites (bina / saha; service_address, geo, bakım ücreti alanları)
              └── elevator_assets (ünite; site_id + customer_id)
```

- **Finans:** `finance_entries` ya `site_id` ya `elevator_asset_id` (mutually exclusive).
- **Aylık bakım kaydı:** `elevator_monthly_maintenance` — `(tenant_id, elevator_asset_id, year_month)` benzersiz; `monthly_checklist` jsonb.

## Roller (`tenant_members.system_role`)

Şema değerleri: `tenant_owner`, `company_admin`, `dispatcher`, `service_manager`, `technician`, `warehouse_manager`, `finance`, `sales_quotation`, `customer_support_readonly`, `customer_portal_user`.

**iOS (şimdilik iki katman):**

- **Yönetici (tam menü):** yukarıdakilerden herhangi biri **teknisyen veya portal kullanıcısı değilse**, veya birden fazla rol varsa ve en az biri “yönetici sınıfı” ise.
- **Teknisyen (dar menü):** kullanıcının **tüm** üyelikleri yalnızca `technician` ve/veya `customer_portal_user` ise (veya ileride sadece `technician`).

Teknisyen menüsü web ürün hedefi: bakım, revizyon, periyodik kontroller, günlük plan / program, rotalar, arızalar (iş emirleri), EN 81-20 maddeleri; montaj kasıtlı sonra.

## Revizyon / periyodik (TSE-resmi bağlam)

- `periodic_controls`: kontrol tarihi, `form_file_path`, `status` (scheduled / completed / cancelled).
- `elevator_revisions`: `periodic_control_id` opsiyonel; `approval_status`, `scheduled_work_at`, `final_ticket` (risk bandı), `elevator_revision_lines` → `revision_articles`.

## Parça / stok

- `service_parts_usage`: `work_type` in (maintenance, revision, repair, assembly); `batch_id`, `finance_entry_id`, stok düşümü ile hizalı.
- `stock_movements`: izlenebilirlik için `elevator_asset_id`, `parts_usage_batch_id`.

Bu belge, her web rotası ve iOS ekranı için **aynı tabloları** kullanma kriteridir.

## iOS teknisyen menü eşlemesi

Native uygulamada dar menü yolları `WorkspaceAccess.technicianWebPaths` ile sabitlenir; web’de aynı kullanıcı için RLS ve ileride route-guard ile hizalanmalıdır.
