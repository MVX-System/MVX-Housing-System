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

const FacilityContext =
  createContext(null);

export function FacilityProvider({
  children,
}) {
  const [
    facility,
    setFacility,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState(null);

  const loadFacility =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const result =
          await api(
            "/api/public/facility-profile"
          );

        if (
          !result ||
          result.error ||
          result.ok === false ||
          !result.facility
        ) {
          setFacility(null);
          setError(
            result?.error ||
            "facility_profile_unavailable"
          );
          return null;
        }

        setFacility(
          result.facility
        );

        return result.facility;
      } catch (loadError) {
        console.error(
          "LOAD FACILITY PROFILE ERROR:",
          loadError
        );

        setFacility(null);
        setError(
          "facility_profile_load_failed"
        );

        return null;
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadFacility();
  }, [loadFacility]);

  return (
    <FacilityContext.Provider
      value={{
        facility,
        loading,
        error,
        refreshFacility:
          loadFacility,
      }}
    >
      {children}
    </FacilityContext.Provider>
  );
}

export function useFacility() {
  const context =
    useContext(
      FacilityContext
    );

  if (!context) {
    throw new Error(
      "useFacility must be used inside FacilityProvider"
    );
  }

  return context;
}
