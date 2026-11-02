const METER_LOCATION_LABELS = {
  en: {
    kitchen: "Kitchen",
    bathroom: "Bathroom",
  },

  lv: {
    kitchen: "Virtuve",
    bathroom: "Vannas istaba",
  },

  ru: {
    kitchen: "Кухня",
    bathroom: "Ванная",
  },
};

const METER_LOCATION_ALIASES = {
  kitchen: "kitchen",
  k: "kitchen",
  bathroom: "bathroom",
  b: "bathroom",
};

export function localizeMeterLocation(
  value,
  language = "en"
) {
  const rawValue =
    String(value ?? "").trim();

  if (!rawValue) {
    return "";
  }

  const locationKey =
    METER_LOCATION_ALIASES[
      rawValue.toLowerCase()
    ];

  if (!locationKey) {
    return rawValue;
  }

  const labels =
    METER_LOCATION_LABELS[language] ||
    METER_LOCATION_LABELS.en;

  return labels[locationKey];
}
