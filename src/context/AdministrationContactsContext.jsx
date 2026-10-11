import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

import {
  api,
} from "../services/api";

const AdministrationContactsContext =
  createContext(null);

const ROLE_KEYS = Object.freeze([
  "manager",
  "accountant",
  "heating_technician",
]);

function emptyContact(
  roleKey
) {
  return {
    role_key: roleKey,
    display_name: "",
    phone: "",
    email: "",
  };
}

function createEmptyContacts() {
  return ROLE_KEYS.map(
    (roleKey) =>
      emptyContact(
        roleKey
      )
  );
}

function normalizeContacts(
  result
) {
  const rows =
    Array.isArray(
      result?.contacts
    )
      ? result.contacts
      : [];

  const byRole =
    new Map(
      rows.map(
        (row) => [
          String(
            row?.role_key ||
            ""
          ).trim(),
          row,
        ]
      )
    );

  return ROLE_KEYS.map(
    (roleKey) => {
      const row =
        byRole.get(
          roleKey
        );

      return {
        role_key:
          roleKey,

        display_name:
          String(
            row?.display_name ||
            ""
          ).trim(),

        phone:
          String(
            row?.phone ||
            ""
          ).trim(),

        email:
          String(
            row?.email ||
            ""
          ).trim(),
      };
    }
  );
}

export function AdministrationContactsProvider({
  children,
}) {
  const [
    contacts,
    setContacts,
  ] = useState(
    createEmptyContacts
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState(null);

  const refreshAdministrationContacts =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const result =
          await api(
            "/api/administration-contacts"
          );

        if (
          !result ||
          result.error ||
          result.ok === false
        ) {
          setContacts(
            createEmptyContacts()
          );

          setError(
            result?.error ||
            "administration_contacts_unavailable"
          );

          return null;
        }

        const normalized =
          normalizeContacts(
            result
          );

        setContacts(
          normalized
        );

        return normalized;
      } catch (loadError) {
        console.error(
          "LOAD ADMINISTRATION CONTACTS ERROR:",
          loadError
        );

        setContacts(
          createEmptyContacts()
        );

        setError(
          "administration_contacts_load_failed"
        );

        return null;
      } finally {
        setLoading(false);
      }
    }, []);

  return (
    <AdministrationContactsContext.Provider
      value={{
        contacts,
        loading,
        error,
        refreshAdministrationContacts,
      }}
    >
      {children}
    </AdministrationContactsContext.Provider>
  );
}

export function useAdministrationContacts() {
  const context =
    useContext(
      AdministrationContactsContext
    );

  if (!context) {
    throw new Error(
      "useAdministrationContacts must be used inside AdministrationContactsProvider"
    );
  }

  return context;
}
