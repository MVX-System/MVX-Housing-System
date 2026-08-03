import { api } from "./client";

export function getAdminWaterMeters(token) {
  return api(token, "/api/admin/water-meters");
}

export function createWaterMeter(token, data) {
  return api(token, "/api/admin/water-meters", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateWaterMeter(token, data) {
  return api(token, "/api/admin/update-water-meter", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deactivateWaterMeter(token, meterId, reason) {
  return api(token, "/api/admin/deactivate-water-meter", {
    method: "POST",
    body: JSON.stringify({ meter_id: meterId, reason }),
  });
}
