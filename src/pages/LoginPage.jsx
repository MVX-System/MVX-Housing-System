import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";

import {
  buttonStyle,
  inputStyle,
} from "../styles/theme";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslation();

  const navigate = useNavigate();

  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");

  const submit = async () => {
    const ok = await login(nick, password);

    if (!ok) {
      return;
    }

    navigate("/");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 400,
          padding: 30,
          border: "1px solid #ccc",
          borderRadius: 10,
        }}
      >
        <h1
          style={{
            lineHeight: 1.2,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.8em" }}>
            MVX System
          </div>

          <div>DzĪKS IRLAVA 20</div>
        </h1>

        <input
          placeholder="Nick"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          style={inputStyle}
          autoComplete="username"
        />

        <input
          type="password"
          placeholder={t("login.placeholders.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          autoComplete="current-password"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              submit();
            }
          }}
        />

        <button
          onClick={submit}
          style={buttonStyle}
        >
          {t("login.login")}
        </button>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/account-recovery"
            )
          }
          style={{
            width: "100%",
            marginTop: 10,
            padding: "8px 12px",
            border: "none",
            background: "none",
            color: "#2563eb",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {t("login.recoverAccess")}
        </button>
      </div>
    </div>
  );
}
