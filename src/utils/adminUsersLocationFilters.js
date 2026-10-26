// PR-9G.7C — non-PII Admin Users location filters.
// Match *whole* apartment numbers: never substring match apartment 2 to 21.
export const locationToken = (value) =>
  value === null || value === undefined ? "" : String(value).trim();

export const linkedApartmentNumbers = (user) =>
  new Set([user?.owner_apartments, user?.resident_apartments]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map(locationToken)
    .filter(Boolean));

const compareLocation = (a, b) => String(a).localeCompare(
  String(b), undefined, { numeric: true, sensitivity: "base" }
);

export const getUserLocationOptions = (apartments, section = "all", floor = "all") => {
  const valid = (Array.isArray(apartments) ? apartments : [])
    .filter((item) => item && locationToken(item.number));
  const sections = [...new Set(valid.map((item) => locationToken(item.section))
    .filter(Boolean))].sort(compareLocation);
  const withinSection = valid.filter((item) => section === "all" ||
    locationToken(item.section) === section);
  const floors = [...new Set(withinSection.map((item) => locationToken(item.floor))
    .filter(Boolean))].sort(compareLocation);
  const candidates = withinSection.filter((item) => floor === "all" ||
    locationToken(item.floor) === floor);
  const numbers = [...new Set(candidates.map((item) => locationToken(item.number)))].sort(compareLocation);
  return { sections, floors, numbers };
};

export function userMatchesLocation(user, apartments, section = "all", floor = "all", numbers = []) {
  if (section === "all" && floor === "all" && !(numbers || []).length) return true;
  const linked = linkedApartmentNumbers(user);
  if (!linked.size) return false;
  const selected = new Set((numbers || []).map(locationToken));
  return (Array.isArray(apartments) ? apartments : []).some((item) =>
    item && linked.has(locationToken(item.number)) &&
    (section === "all" || locationToken(item.section) === section) &&
    (floor === "all" || locationToken(item.floor) === floor) &&
    (!selected.size || selected.has(locationToken(item.number)))
  );
}

const translations = {
  en: { section: "Entrance / section", floor: "Floor", apartments: "Apartments",
    allSections: "All entrances", allFloors: "All floors", selected: "selected",
    none: "No apartments", reset: "Reset location", allApartments: "Any apartment" },
  lv: { section: "Kāpņu telpa / sekcija", floor: "Stāvs", apartments: "Dzīvokļi",
    allSections: "Visas kāpņu telpas", allFloors: "Visi stāvi", selected: "atlasīti",
    none: "Nav dzīvokļu", reset: "Atiestatīt atrašanās vietu", allApartments: "Jebkurš dzīvoklis" },
  ru: { section: "Подъезд / секция", floor: "Этаж", apartments: "Квартиры",
    allSections: "Все подъезды", allFloors: "Все этажи", selected: "выбрано",
    none: "Нет квартир", reset: "Сбросить расположение", allApartments: "Любая квартира" },
};
export const getUserLocationLabels = (value) =>
  translations[String(value || "en").toLowerCase().slice(0, 2)] || translations.en;

