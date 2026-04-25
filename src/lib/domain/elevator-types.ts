/** Web formda seçilebilir türler (DB `elevator_type` metin alanı). */
export const ELEVATOR_TYPES = [
  { value: "mr", label: "MR" },
  { value: "mrl", label: "MRL" },
  { value: "hydraulic", label: "Hidrolik" },
] as const;

export const DEFAULT_ELEVATOR_TYPE = "mr" as const;

export const OPERATIONAL_STATUSES = [
  { value: "in_service", label: "Hizmette" },
  { value: "limited", label: "Kısıtlı" },
  { value: "out_of_service", label: "Hizmet dışı" },
  { value: "unsafe", label: "Güvensiz" },
  { value: "decommissioned", label: "Devreden çıkarıldı" },
] as const;

export const CUSTOMER_STATUSES = ["active", "inactive", "suspended"] as const;
