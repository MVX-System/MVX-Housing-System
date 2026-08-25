import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  api,
} from "../services/api";

const AuthContext =
  createContext(null);

export function AuthProvider({
  children,
}) {
  const [
    token,
    setToken,
  ] = useState(
    localStorage.getItem(
      "token"
    )
  );

  const [
    me,
    setMe,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const clearLocalSession =
    useCallback(() => {
      localStorage.removeItem(
        "token"
      );
      sessionStorage.clear();
      setToken(null);
      setMe(null);
    }, []);

  const logout =
    useCallback(async () => {
      try {
        if (
          localStorage.getItem(
            "token"
          )
        ) {
          await api(
            "/api/logout",
            {
              method: "POST",
            }
          );
        }
      } catch {
        // Local logout must still complete if the server is unavailable.
      } finally {
        clearLocalSession();
        window.location.href =
          "/login";
      }
    }, [clearLocalSession]);

  const expireLocalSession =
    useCallback(() => {
      clearLocalSession();
      window.location.href =
        "/login";
    }, [clearLocalSession]);

  const refreshMe =
    useCallback(async () => {
      const meData =
        await api(
          "/api/me"
        );

      if (
        !meData?.user
      ) {
        expireLocalSession();
        return null;
      }

      setMe(meData);
      return meData;
    }, [expireLocalSession]);

  useEffect(() => {
    let active = true;

    const load =
      async () => {
        if (!token) {
          if (active) {
            setMe(null);
            setLoading(false);
          }
          return;
        }

        setLoading(true);

        try {
          const meData =
            await api(
              "/api/me"
            );

          if (!active) {
            return;
          }

          if (
            !meData?.user
          ) {
            expireLocalSession();
            return;
          }

          setMe(meData);
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

    load();

    return () => {
      active = false;
    };
  }, [
    token,
    expireLocalSession,
  ]);

  const login =
    async (
      nick,
      password
    ) => {
      const res =
        await api(
          "/api/login",
          {
            method: "POST",
            body:
              JSON.stringify({
                nick,
                password,
              }),
          }
        );

      if (!res?.token) {
        alert(
          res?.error ||
          "Login failed"
        );
        return false;
      }

      localStorage.setItem(
        "token",
        res.token
      );
      setToken(
        res.token
      );

      const meData =
        await api(
          "/api/me"
        );

      if (
        !meData?.user
      ) {
        expireLocalSession();
        return false;
      }

      setMe(meData);
      return true;
    };

  const value = {
    token,
    me,
    login,
    logout,
    loading,
    refreshMe,
  };

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(
    AuthContext
  );
}
