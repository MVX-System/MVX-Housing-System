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

  const logout =
    useCallback(() => {
      localStorage.removeItem(
        "token"
      );

      sessionStorage.clear();

      setToken(null);
      setMe(null);

      window.location.href =
        "/login";
    }, []);

  const refreshMe =
    useCallback(async () => {
      const meData =
        await api(
          "/api/me"
        );

      if (
        !meData?.user
      ) {
        logout();
        return null;
      }

      setMe(meData);

      return meData;
    }, [logout]);

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
            logout();
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
    logout,
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
        logout();
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
