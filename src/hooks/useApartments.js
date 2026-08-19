import { useState } from "react";
import { api } from "../services/api";

export default function useApartments() {

const [apartments, setApartments] =
useState([]);

const [loading, setLoading] =
useState(false);

const [showCreateApartment,
setShowCreateApartment] =
useState(false);

const [newApartment,
setNewApartment] =
useState({
number: "",
section: "",
floor: "",
level_count: 1,
living_area: "",
non_living_area: "",
heated_area: "",
notes: "",
});

// =========================
// LOAD APARTMENTS
// =========================

const loadApartments = async () => {

try {
  setLoading(true);

  const d = await api(
    "/api/apartments/full"
  );

  setApartments(
    Array.isArray(d)
      ? d
      : []
  );
} finally {
  setLoading(false);
}

};

// =========================
// LOAD ONE APARTMENT DETAILS
// =========================

const loadApartmentDetails =
async (apartmentId) => {

if (
  apartmentId === null ||
  apartmentId === undefined ||
  apartmentId === ""
) {
  return null;
}

const result = await api(
  `/api/admin/apartment-details?id=${encodeURIComponent(
    apartmentId
  )}`
);

if (
  !result ||
  result.error
) {
  console.error(
    "LOAD APARTMENT DETAILS ERROR:",
    result?.error ||
    "unknown_error"
  );

  return null;
}

return {
  ...(result.apartment || {}),
  owners:
    Array.isArray(result.owners)
      ? result.owners
      : [],
  residents:
    Array.isArray(result.residents)
      ? result.residents
      : [],
};

};

// =========================
// CREATE APARTMENT
// =========================

const createApartment = async () => {

const res = await api(
  "/api/admin/create-apartment",
  {
    method: "POST",

    body: JSON.stringify(
      newApartment
    ),
  }
);

if (res.ok) {
  alert(
    "Apartment created"
  );

  setShowCreateApartment(
    false
  );

  setNewApartment({
    number: "",
    section: "",
    floor: "",
    living_area: "",
    heated_area: "",
    level_count: 1,
    notes: "",
  });

  await loadApartments();
} else {
  alert(
    res.error ||
    "Create failed"
  );
}

};

return {

apartments,
setApartments,

loading,

showCreateApartment,
setShowCreateApartment,

newApartment,
setNewApartment,

loadApartments,
loadApartmentDetails,
createApartment,

};
}
