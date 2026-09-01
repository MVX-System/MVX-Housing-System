import {
  api,
} from "../services/api";

export function loginRequest(
  email,
  password
) {
  return api(
    "/api/login",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );
}

export function getMe(
  token
) {
  return api(
    "/api/me",
    token
      ? {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      : {}
  );
}

export function changePassword(
  currentPassword,
  newPassword
) {
  return api(
    "/api/change-password",
    {
      method: "POST",
      body: JSON.stringify({
        current_password:
          currentPassword,
        new_password:
          newPassword,
      }),
    }
  );
}

export function accountRecoveryReset(
  nick,
  recoveryCode,
  newPassword
) {
  return api(
    "/api/account-recovery/reset",
    {
      method: "POST",
      body: JSON.stringify({
        nick,
        recovery_code:
          recoveryCode,
        new_password:
          newPassword,
      }),
    }
  );
}
