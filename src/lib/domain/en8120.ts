/** EN 81-20 (elevator safety) — control, revision prep vs repair, maintenance takeover (Turkish UI labels). */

export const EN8120_CONTROL_AUTHORITIES = [
  { value: "government", label: "Resmî denetim birimi (Bakanlık / il müdürlüğü süreci)" },
  { value: "private_control_company", label: "Özel kontrol kuruluşu (akredite laboratuvar)" },
] as const;

export type En8120ControlAuthority = (typeof EN8120_CONTROL_AUTHORITIES)[number]["value"];

/** How the service company became the maintainer of the elevator. */
export const MAINTENANCE_TRANSFER_BASES = [
  {
    value: "direct_after_prior_expiry",
    label: "Önceki sözleşme bitişi sonrası doğrudan bakım sözleşmesi",
    description:
      "Yönetim ile asansör firması arasında aylık bakım ücreti netleşir; firma her ay sahayı ziyaret etmelidir.",
  },
  {
    value: "after_annual_en8120",
    label: "Yıllık EN 81-20 / revizyon kontrolü sonrası devir",
    description:
      "Periyodik kontrol ve revizyon süreci tamamlandıktan sonra bakım başka firmaya geçebilir.",
  },
] as const;

export type MaintenanceTransferBasis = (typeof MAINTENANCE_TRANSFER_BASES)[number]["value"];

/** Monthly contractual visit checklist (direct maintenance contract). */
export const MONTHLY_MAINTENANCE_CHECKPOINTS = [
  { key: "rails", label: "Raylar", hint: "Yüzeyde yağ birikimi var mı?" },
  { key: "doors", label: "Kapılar", hint: "Hareket akıcı mı, parçalar uygun mu?" },
  { key: "engine_oil", label: "Motor / makine", hint: "Yağ seviyesi uygun mu?" },
  { key: "brakes", label: "Frenler", hint: "Fren sistemi kontrolü" },
  { key: "hydraulic_buffer", label: "Hidrolik tampon / tampon", hint: "Tampon ve ilgili güvenlik" },
] as const;

export type MonthlyCheckpointKey = (typeof MONTHLY_MAINTENANCE_CHECKPOINTS)[number]["key"];

export const CHECKPOINT_STATUS = [
  { value: "ok", label: "Uygun" },
  { value: "issue", label: "Aksaklık" },
  { value: "na", label: "Uygulanamaz" },
] as const;

/** Short copy for parts usage: revision = EN 81-20 prep; repair = technical fault. */
export const PARTS_USAGE_REVISION_REPAIR_HINT =
  "Revizyon: EN 81-20 periyodik kontrole hazırlık; madde bazlı maliyetler revizyon kalemlerinden takip edilir. Onarım: arıza kaynaklı teknik müdahale (ör. kapı makarası → motor yükü → parça değişimi).";
