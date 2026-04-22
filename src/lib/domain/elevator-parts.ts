/** Elevator spare parts — subsystems and categories for stock metadata (TR labels in UI). */
export const ELEVATOR_SUBSYSTEMS = [
  { value: "traction", label: "Tahrik (motor, redüktör, halat, kasnak)" },
  { value: "door", label: "Kapı (kapı motoru, kızak, kilit, fotosel)" },
  { value: "safety", label: "Güvenlik (governor, counterweight, buffer)" },
  { value: "hydraulic", label: "Hidrolik (silindir, ünite, hortum, valf)" },
  { value: "controller", label: "Kumanda (PLC, inverter, PCB, encoder)" },
  { value: "electrical", label: "Elektrik (kontaktör, sigorta, kablo, buton)" },
  { value: "cabin", label: "Kabin (ağırlık, ray, süspansiyon)" },
  { value: "guide", label: "Ray / kılavuz" },
  { value: "other", label: "Diğer" },
] as const;

export const PART_CATEGORIES = [
  { value: "rope", label: "Halat" },
  { value: "sheave", label: "Kasnak" },
  { value: "brake", label: "Fren" },
  { value: "door_operator", label: "Kapı motoru / operatör" },
  { value: "door_hanger", label: "Kapı askı / kızak" },
  { value: "roller", label: "Makara / rulman" },
  { value: "sensor", label: "Sensör / limit" },
  { value: "pcb", label: "Elektronik kart" },
  { value: "hydraulic_seal", label: "Keçe / contası" },
  { value: "fastener", label: "Bağlantı elemanı" },
  { value: "lubricant", label: "Yağlama" },
  { value: "consumable", label: "Sarf" },
  { value: "other", label: "Diğer" },
] as const;
