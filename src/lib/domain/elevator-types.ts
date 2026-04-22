export const ELEVATOR_TYPES = [
  { value: "passenger", label: "Passenger" },
  { value: "freight", label: "Freight" },
  { value: "hospital", label: "Hospital" },
  { value: "panoramic", label: "Panoramic" },
  { value: "dumbwaiter", label: "Dumbwaiter" },
  { value: "platform", label: "Platform lift" },
  { value: "hydraulic", label: "Hydraulic" },
  { value: "traction", label: "Traction" },
  { value: "mrl", label: "MRL" },
  { value: "other", label: "Other" },
] as const;

export const OPERATIONAL_STATUSES = [
  { value: "in_service", label: "In service" },
  { value: "limited", label: "Limited" },
  { value: "out_of_service", label: "Out of service" },
  { value: "unsafe", label: "Unsafe" },
  { value: "decommissioned", label: "Decommissioned" },
] as const;

export const CUSTOMER_STATUSES = ["active", "inactive", "suspended"] as const;
