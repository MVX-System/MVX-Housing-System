import {
  api,
} from "./client";

export function loginRequest(
  email,
  password
) {
  return api(
    null,
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
    token,
    "/api/me"
  );
}

export function changePassword(
  currentPassword,
  newPassword
) {
  return api(
    null,
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
    null,
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
