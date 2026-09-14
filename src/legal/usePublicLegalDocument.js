import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useFacility,
} from "../context/FacilityContext";

import {
  usePublicContact,
} from "../context/PublicContactContext";

import {
  useTranslation,
} from "../i18n";

import {
  getPublicLegalDocument,
} from "./publicLegalDocuments";

export default function usePublicLegalDocument(
  documentSlug
) {
  const {
    language,
  } = useTranslation();

  const {
    facility,
    loading: facilityLoading,
    error: facilityError,
  } = useFacility();

  const {
    publicContact,
    loading: contactLoading,
    error: contactError,
    refreshPublicContact,
  } = usePublicContact();

  const [
    contactAttemptComplete,
    setContactAttemptComplete,
  ] = useState(false);

  useEffect(
    () => {
      let active = true;

      setContactAttemptComplete(
        false
      );

      Promise.resolve(
        refreshPublicContact()
      ).finally(
        () => {
          if (active) {
            setContactAttemptComplete(
              true
            );
          }
        }
      );

      return () => {
        active = false;
      };
    },
    [refreshPublicContact]
  );

  return useMemo(
    () => {
      const loading =
        facilityLoading ||
        contactLoading ||
        !contactAttemptComplete;

      if (loading) {
        return {
          document: null,
          loading: true,
          error: null,
        };
      }

      if (
        facilityError ||
        !facility
      ) {
        return {
          document: null,
          loading: false,
          error:
            facilityError ||
            "legal_facility_unavailable",
        };
      }

      if (contactError) {
        return {
          document: null,
          loading: false,
          error: contactError,
        };
      }

      const documentSetKey =
        facility.document_set_key;

      if (
        typeof documentSetKey !==
          "string" ||
        !documentSetKey.trim()
      ) {
        return {
          document: null,
          loading: false,
          error:
            "legal_document_set_missing",
        };
      }

      try {
        const document =
          getPublicLegalDocument({
            documentSetKey,
            documentSlug,
            language,
            facility,
            publicContact,
          });

        return {
          document,
          loading: false,
          error: null,
        };
      } catch (loadError) {
        const error =
          loadError instanceof Error &&
          loadError.message
            ? loadError.message
            : "legal_document_runtime_failed";

        return {
          document: null,
          loading: false,
          error,
        };
      }
    },
    [
      documentSlug,
      language,
      facility,
      facilityLoading,
      facilityError,
      publicContact,
      contactLoading,
      contactError,
      contactAttemptComplete,
    ]
  );
}
