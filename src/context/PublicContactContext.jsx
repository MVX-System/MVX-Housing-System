import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

import {
  api,
} from "../services/api";

const PublicContactContext =
  createContext(null);

const EMPTY_PUBLIC_CONTACT =
  Object.freeze({
    support_email: "",
    support_phone: "",
  });

function normalizePublicContact(
  result
) {
  return {
    support_email:
      String(
        result?.support_email ||
        ""
      ).trim(),

    support_phone:
      String(
        result?.support_phone ||
        ""
      ).trim(),
  };
}

export function PublicContactProvider({
  children,
}) {
  const [
    publicContact,
    setPublicContact,
  ] = useState(
    EMPTY_PUBLIC_CONTACT
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState(null);

  const refreshPublicContact =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const result =
          await api(
            "/api/public/contact-settings"
          );

        if (
          !result ||
          result.error ||
          result.ok === false
        ) {
          setPublicContact(
            EMPTY_PUBLIC_CONTACT
          );

          setError(
            result?.error ||
            "public_contact_unavailable"
          );

          return null;
        }

        const normalized =
          normalizePublicContact(
            result
          );

        setPublicContact(
          normalized
        );

        return normalized;
      } catch (loadError) {
        console.error(
          "LOAD PUBLIC CONTACT SETTINGS ERROR:",
          loadError
        );

        setPublicContact(
          EMPTY_PUBLIC_CONTACT
        );

        setError(
          "public_contact_load_failed"
        );

        return null;
      } finally {
        setLoading(false);
      }
    }, []);

  return (
    <PublicContactContext.Provider
      value={{
        publicContact,
        loading,
        error,
        refreshPublicContact,
      }}
    >
      {children}
    </PublicContactContext.Provider>
  );
}

export function usePublicContact() {
  const context =
    useContext(
      PublicContactContext
    );

  if (!context) {
    throw new Error(
      "usePublicContact must be used inside PublicContactProvider"
    );
  }

  return context;
}
