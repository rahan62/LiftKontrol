export const ELEVATOR_TYPES = [
  { value: "passenger", label: "Yolcu" },
  { value: "freight", label: "Yük" },
  { value: "hospital", label: "Hastane" },
  { value: "panoramic", label: "Panoramik" },
  { value: "dumbwaiter", label: "Servis asansörü" },
  { value: "platform", label: "Platform asansörü" },
  { value: "hydraulic", label: "Hidrolik" },
  { value: "traction", label: "Halatlı (çekiş)" },
  { value: "mrl", label: "Makine dairesiz (MRL)" },
  { value: "other", label: "Diğer" },
] as const;

export const OPERATIONAL_STATUSES = [
  { value: "in_service", label: "Hizmette" },
  { value: "limited", label: "Kısıtlı" },
  { value: "out_of_service", label: "Hizmet dışı" },
  { value: "unsafe", label: "Güvensiz" },
  { value: "decommissioned", label: "Devreden çıkarıldı" },
] as const;

export const CUSTOMER_STATUSES = ["active", "inactive", "suspended"] as const;
