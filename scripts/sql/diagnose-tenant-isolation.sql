-- Kiracı izolasyonu teşhisi: her tabloda kaç farklı tenant_id var, satır sayıları.
-- Beklenti: gerçek müşteri / saha / asansör verileri yalnızca ilgili firmaların tenant_id değerinde olmalı.
-- Tek tenant_id altında toplanmış eski veriyi tespit etmek için çalıştırın.

SELECT 'customers' AS tbl, tenant_id::text, count(*)::bigint AS n FROM public.customers GROUP BY tenant_id
UNION ALL
SELECT 'sites', tenant_id::text, count(*)::bigint FROM public.sites GROUP BY tenant_id
UNION ALL
SELECT 'elevator_assets', tenant_id::text, count(*)::bigint FROM public.elevator_assets GROUP BY tenant_id
UNION ALL
SELECT 'finance_entries', tenant_id::text, count(*)::bigint FROM public.finance_entries GROUP BY tenant_id
UNION ALL
SELECT 'work_orders', tenant_id::text, count(*)::bigint FROM public.work_orders GROUP BY tenant_id
UNION ALL
SELECT 'field_crews', tenant_id::text, count(*)::bigint FROM public.field_crews GROUP BY tenant_id
ORDER BY tbl, tenant_id;

-- Kullanıcı başına atanmış kiracılar (her kullanıcı farklı firmada olmalı):
SELECT u.email, tm.tenant_id::text, t.name AS tenant_name, tm.system_role
FROM auth.users u
JOIN public.tenant_members tm ON tm.user_id = u.id AND tm.is_active = true
JOIN public.tenants t ON t.id = tm.tenant_id
ORDER BY u.email, tm.joined_at;
