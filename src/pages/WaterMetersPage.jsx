import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Modal
  from "../components/Modal";

import { api }
  from "../services/api";

import useWater
  from "../hooks/useWater";

export default function WaterMetersPage() {

  const {
    adminWaterMeters,
    loadAdminWaterMeters,
    addWaterMeter,
    updateWaterMeter,
    loadApartmentRisers,
    uploadCalibrationDocument,
    loadWaterMeterCalibrations,
    clearWaterMeterCalibrations,
    meterCalibrations,
    meterCalibrationsLoading,
    openCalibrationDocument,
    deactivateMeter,
  } = useWater();

  const [
    isMobile,
    setIsMobile
  ] = useState(
    window.innerWidth < 768
  );

  const [
    apartments,
    setApartments
  ] = useState([]);

  const [
    apartmentRisers,
    setApartmentRisers
  ] = useState([]);

  const [
    risersLoading,
    setRisersLoading
  ] = useState(false);

  const [
    loading,
    setLoading
  ] = useState(false);

  const [
    filter,
    setFilter
  ] = useState({
    search: "",
    type: "all",
    status: "active",
    calibration: "all",
  });

  const [
    addOpen,
    setAddOpen
  ] = useState(false);

  const [
    addSubmitting,
    setAddSubmitting
  ] = useState(false);

  const [
    editOpen,
    setEditOpen
  ] = useState(false);

  const [
    editSubmitting,
    setEditSubmitting
  ] = useState(false);

  const [
    editRisers,
    setEditRisers
  ] = useState([]);

  const [
    editForm,
    setEditForm
  ] = useState({
    id: null,
    apartmentId: "",
    apartmentRiserId: "",
    type: "cold",
    serialNumber: "",
    manufacturer: "",
    model: "",
    installedAt: "",
    initialReading: "",
    initialReadingDate: "",
    correctionReason: "",
  });

  const [
    addForm,
    setAddForm
  ] = useState({
    apartmentId: "",
    apartmentRiserId: "",
    type: "cold",
    serialNumber: "",
    manufacturer: "",
    model: "",
    installedAt: "",
    initialReading: "",
    calibrationSameAsInstallation: true,
    calibrationDate: "",
    validityPreset: "12",
    validityMonths: "12",
    certificateNumber: "",
    calibrationLaboratory: "",
    calibrationNotes: "",
    calibrationDocument: null,
    certificateAvailable: true,
  });

  const [
    deactivateOpen,
    setDeactivateOpen
  ] = useState(false);

  const [
    selectedMeterIds,
    setSelectedMeterIds
  ] = useState([]);

  const [
    deactivateReason,
    setDeactivateReason
  ] = useState("replacement");

  const [
    deactivateSubmitting,
    setDeactivateSubmitting
  ] = useState(false);

  const [
    calibrationOpen,
    setCalibrationOpen
  ] = useState(false);

  const [
    selectedCalibrationMeter,
    setSelectedCalibrationMeter
  ] = useState(null);

  const [
    calibrationSubmitting,
    setCalibrationSubmitting
  ] = useState(false);

  const [
    calibrationForm,
    setCalibrationForm
  ] = useState({
    calibrationDate: "",
    validityMonths: "12",
    certificateNumber: "",
    calibrationLaboratory: "",
    notes: "",
    document: null,
  });

  useEffect(() => {

    const handleResize = () => {

      setIsMobile(
        window.innerWidth < 768
      );
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () =>
      window.removeEventListener(
        "resize",
        handleResize
      );

  }, []);

  const loadPageData =
    async () => {

      setLoading(true);

      try {

        const [
          apartmentData,
        ] = await Promise.all([
          api(
            "/api/admin/apartments"
          ),

          loadAdminWaterMeters(),
        ]);

        setApartments(
          Array.isArray(
            apartmentData
          )
            ? apartmentData
            : []
        );

      } catch (error) {

        console.error(
          "Load water meter management failed:",
          error
        );

        alert(
          "Water meter data load failed"
        );

      } finally {

        setLoading(false);
      }
    };

  useEffect(() => {

    loadPageData();

  }, []);

  const normalizedMeters =
    useMemo(
      () =>
        adminWaterMeters.map(
          (meter) => ({

            ...meter,

            status:
              Number(
                meter.active
              ) === 1
                ? "active"
                : "inactive",

            riser:
              meter.riser_code ||
              "Not assigned",

            location:
              meter.local_label ||
              "Not assigned",

            calibration_status:
              calculateCalibrationStatus(
                meter.calibration_expires_at
              ).key,
          })
        ),
      [adminWaterMeters]
    );

  const filteredMeters =
    useMemo(
      () =>
        normalizedMeters.filter(
          (meter) => {

            const search =
              filter.search
                .trim()
                .toLowerCase();

            if (search) {

              const searchable =
                [
                  meter.apartment_number,
                  meter.type,
                  meter.serial_number,
                  meter.riser,
                  meter.location,
                ]
                  .map(
                    (value) =>
                      String(
                        value ?? ""
                      ).toLowerCase()
                  )
                  .join(" ");

              if (
                !searchable.includes(
                  search
                )
              ) {
                return false;
              }
            }

            if (
              filter.type !== "all" &&
              meter.type !==
                filter.type
            ) {
              return false;
            }

            if (
              filter.status !== "all" &&
              meter.status !==
                filter.status
            ) {
              return false;
            }

            if (
              filter.calibration !== "all" &&
              meter.calibration_status !==
                filter.calibration
            ) {
              return false;
            }

            return true;
          }
        ),
      [
        normalizedMeters,
        filter,
      ]
    );

  const groupedMeters =
    useMemo(
      () =>
        Object.values(
          filteredMeters.reduce(
            (
              groups,
              meter
            ) => {

              const key =
                String(
                  meter.apartment_id
                );

              if (!groups[key]) {

                groups[key] = {
                  apartment_id:
                    meter.apartment_id,

                  apartment_number:
                    meter.apartment_number,

                  meters: [],
                };
              }

              groups[key]
                .meters.push(
                  meter
                );

              return groups;
            },
            {}
          )
        ).sort(
          (a, b) =>
            Number(
              a.apartment_number
            ) -
            Number(
              b.apartment_number
            )
        ),
      [filteredMeters]
    );

  const activeMeters =
    normalizedMeters.filter(
      (meter) =>
        meter.status ===
        "active"
    );

  const calibrationSummary =
    useMemo(
      () => {

        const summary = {
          valid: 0,
          warning: 0,
          expired: 0,
          missing: 0,
        };

        normalizedMeters
          .filter(
            (meter) =>
              meter.status ===
              "active"
          )
          .forEach(
            (meter) => {

              const key =
                meter.calibration_status;

              if (
                Object.prototype
                  .hasOwnProperty.call(
                    summary,
                    key
                  )
              ) {
                summary[key] += 1;
              }
            }
          );

        return summary;
      },
      [normalizedMeters]
    );

  const resetAddForm = () => {

    setAddForm({
      apartmentId: "",
      apartmentRiserId: "",
      type: "cold",
      serialNumber: "",
      manufacturer: "",
      model: "",
      installedAt: "",
      initialReading: "",
      calibrationSameAsInstallation: true,
      calibrationDate: "",
      validityPreset: "12",
      validityMonths: "12",
      certificateNumber: "",
      calibrationLaboratory: "",
      calibrationNotes: "",
      calibrationDocument: null,
      certificateAvailable: true,
    });

    setApartmentRisers([]);
  };

  const handleApartmentChange =
    async (
      apartmentId
    ) => {

      setAddForm(
        (current) => ({
          ...current,
          apartmentId,
          apartmentRiserId: "",
        })
      );

      setApartmentRisers([]);

      if (!apartmentId) {
        return;
      }

      setRisersLoading(true);

      try {

        const risers =
          await loadApartmentRisers(
            apartmentId
          );

        setApartmentRisers(
          risers
        );

      } finally {

        setRisersLoading(false);
      }
    };

  const openEditMeter =
    async (meter) => {

      const risers =
        await loadApartmentRisers(
          meter.apartment_id
        );

      setEditRisers(
        Array.isArray(risers)
          ? risers
          : []
      );

      setEditForm({
        id: meter.id,
        apartmentId:
          String(meter.apartment_id),
        apartmentRiserId:
          meter.apartment_riser_id
            ? String(
                meter.apartment_riser_id
              )
            : "",
        type: meter.type || "cold",
        serialNumber:
          meter.serial_number || "",
        manufacturer:
          meter.manufacturer || "",
        model: meter.model || "",
        installedAt:
          meter.installed_at
            ? String(
                meter.installed_at
              ).slice(0, 10)
            : "",
        initialReading:
          meter.initial_reading === null ||
          meter.initial_reading === undefined
            ? ""
            : (
                Number(
                  meter.initial_reading
                ) / 1000
              )
                .toFixed(3)
                .replace(".", ","),
        initialReadingDate:
          meter.initial_reading_date
            ? String(
                meter.initial_reading_date
              ).slice(0, 10)
            : "",
        correctionReason: "",
      });

      setEditOpen(true);
    };

  const handleEditMeter =
    async () => {

      if (editSubmitting) {
        return;
      }

      const initialReading =
        parseReadingValue(
          editForm.initialReading
        );

      if (
        editForm.initialReading &&
        initialReading === null
      ) {
        alert(
          "Enter initial reading in m³ with up to 3 decimal places"
        );
        return;
      }

      setEditSubmitting(true);

      try {
        const result =
          await updateWaterMeter({
            meterId: editForm.id,
            apartmentId:
              editForm.apartmentId,
            apartmentRiserId:
              editForm.apartmentRiserId ||
              null,
            type: editForm.type,
            serialNumber:
              editForm.serialNumber,
            manufacturer:
              editForm.manufacturer,
            model: editForm.model,
            installedAt:
              editForm.installedAt ||
              null,
            initialReading,
            initialReadingDate:
              editForm.initialReadingDate ||
              null,
            correctionReason:
              editForm.correctionReason,
          });

        if (result?.ok) {
          setEditOpen(false);
          await loadAdminWaterMeters();
          alert(
            "Water meter updated"
          );
        }
      } finally {
        setEditSubmitting(false);
      }
    };

  const calculatedExpiresAt =
    useMemo(
      () => {

        if (
          !addForm.calibrationDate ||
          !addForm.validityMonths
        ) {
          return "";
        }

        const [
          year,
          month,
          day,
        ] =
          addForm.calibrationDate
            .split("-")
            .map(Number);

        const months =
          Number(
            addForm.validityMonths
          );

        if (
          !year ||
          !month ||
          !day ||
          !Number.isInteger(
            months
          ) ||
          months <= 0
        ) {
          return "";
        }

        const date =
          new Date(
            Date.UTC(
              year,
              month - 1 + months,
              1
            )
          );

        const lastDay =
          new Date(
            Date.UTC(
              date.getUTCFullYear(),
              date.getUTCMonth() + 1,
              0
            )
          ).getUTCDate();

        date.setUTCDate(
          Math.min(
            day,
            lastDay
          )
        );

        return date
          .toISOString()
          .slice(0, 10);
      },
      [
        addForm.calibrationDate,
        addForm.validityMonths,
      ]
    );

  const parseReadingValue =
    (
      value
    ) => {

      const normalized =
        String(
          value || ""
        )
          .trim()
          .replace(
            ",",
            "."
          );

      if (!normalized) {
        return null;
      }

      if (
        !/^\d+(\.\d{1,3})?$/.test(
          normalized
        )
      ) {
        return null;
      }

      return Math.round(
        Number(
          normalized
        ) * 1000
      );
    };

  const handleAddMeter =
    async () => {

      if (addSubmitting) {
        return;
      }

      setAddSubmitting(true);

      try {

        if (
          !addForm.apartmentRiserId
        ) {

          alert(
            "Select a riser"
          );

          return;
        }

        if (
          addForm.certificateAvailable &&
          !addForm.calibrationDate
        ) {

          alert(
            "Select calibration date"
          );

          return;
        }

        if (
          addForm.certificateAvailable &&
          !addForm.calibrationDocument
        ) {

          alert(
            "Select calibration document"
          );

          return;
        }

        if (
          !addForm.certificateAvailable &&
          !window.confirm(
            "The calibration certificate is unavailable. Add this water meter without a calibration document?"
          )
        ) {
          return;
        }

        const initialReading =
          parseReadingValue(
            addForm.initialReading
          );

        if (
          addForm.initialReading &&
          initialReading === null
        ) {

          alert(
            "Enter initial reading in m³ with up to 3 decimal places"
          );

          return;
        }

        const meterResult =
          await addWaterMeter({
            apartmentId:
              addForm.apartmentId,

            apartmentRiserId:
              addForm.apartmentRiserId,

            type:
              addForm.type,

            serialNumber:
              addForm.serialNumber,

            manufacturer:
              addForm.manufacturer,

            model:
              addForm.model,

            installedAt:
              addForm.installedAt,

            initialReading,

            initialReadingDate:
              addForm.installedAt ||
              addForm.calibrationDate ||
              new Date()
                .toISOString()
                .slice(0, 10),

            options: {
              suppressSuccessAlert:
                true,

              suppressReload:
                true,
            },
          });

        if (!meterResult?.ok) {
          return;
        }

        let calibrationResult = {
          ok: true,
          skipped: true,
        };

        if (
          addForm.certificateAvailable
        ) {
          calibrationResult =
            await uploadCalibrationDocument({
            meterId:
              meterResult.meter_id,

            calibrationDate:
              addForm.calibrationDate,

            validityMonths:
              Number(
                addForm.validityMonths
              ),

            notes:
              addForm.calibrationNotes,

            certificateNumber:
              addForm.certificateNumber,

            calibrationLaboratory:
              addForm.calibrationLaboratory,

            certificate:
              addForm.calibrationDocument,

            options: {
              suppressSuccessAlert:
                true,

              suppressReload:
                true,
            },
          });


        }

        await loadAdminWaterMeters();

        if (
          calibrationResult?.ok
        ) {

          setAddOpen(false);
          resetAddForm();

          alert(
            addForm.certificateAvailable
              ? "Water meter and calibration document added"
              : "Water meter added without calibration document"
          );

        } else {

          alert(
            "Water meter was created, but the calibration document was not saved."
          );
        }

      } finally {

        setAddSubmitting(false);
      }
    };

  const openCalibrationHistory =
    async (
      meter
    ) => {

      setSelectedCalibrationMeter(
        meter
      );

      setCalibrationForm({
        calibrationDate: "",
        validityMonths: "12",
        certificateNumber: "",
        calibrationLaboratory: "",
        notes: "",
        document: null,
      });

      setCalibrationOpen(true);

      await loadWaterMeterCalibrations(
        meter.id
      );
    };

  const closeCalibrationHistory =
    () => {

      setCalibrationOpen(false);
      setSelectedCalibrationMeter(null);
      clearWaterMeterCalibrations();
    };

  const handleAddCalibration =
    async () => {

      if (
        !selectedCalibrationMeter ||
        calibrationSubmitting
      ) {
        return;
      }

      setCalibrationSubmitting(
        true
      );

      try {

        const result =
          await uploadCalibrationDocument({
            meterId:
              selectedCalibrationMeter.id,

            calibrationDate:
              calibrationForm.calibrationDate,

            validityMonths:
              Number(
                calibrationForm.validityMonths
              ),

            certificateNumber:
              calibrationForm.certificateNumber,

            calibrationLaboratory:
              calibrationForm.calibrationLaboratory,

            notes:
              calibrationForm.notes,

            certificate:
              calibrationForm.document,

            options: {
              suppressSuccessAlert:
                true,

              suppressReload:
                true,
            },
          });

        if (result?.ok) {

          await Promise.all([
            loadAdminWaterMeters(),

            loadWaterMeterCalibrations(
              selectedCalibrationMeter.id
            ),
          ]);

          setCalibrationForm({
            calibrationDate: "",
            validityMonths: "12",
            certificateNumber: "",
            calibrationLaboratory: "",
            notes: "",
            document: null,
          });

          alert(
            "Calibration added"
          );
        }

      } finally {

        setCalibrationSubmitting(
          false
        );
      }
    };

  const toggleSelectedMeter =
    (meterId) => {

      setSelectedMeterIds(
        (current) =>
          current.includes(
            meterId
          )
            ? current.filter(
                (id) =>
                  id !== meterId
              )
            : [
                ...current,
                meterId,
              ]
      );
    };

  const openDeactivate = () => {

    setSelectedMeterIds([]);
    setDeactivateReason(
      "replacement"
    );
    setDeactivateOpen(true);
  };

  const handleDeactivate =
    async () => {

      if (
        deactivateSubmitting
      ) {
        return;
      }

      if (
        selectedMeterIds.length ===
        0
      ) {

        alert(
          "Select at least one active water meter"
        );

        return;
      }

      setDeactivateSubmitting(
        true
      );

      let successCount = 0;

      try {

        for (
          const meterId of
          selectedMeterIds
        ) {

          const success =
            await deactivateMeter(
              meterId,
              deactivateReason,
              {
                suppressSuccessAlert:
                  true,

                suppressReload:
                  true,
              }
            );

          if (!success) {
            break;
          }

          successCount += 1;
        }

        if (
          successCount > 0
        ) {

          await loadAdminWaterMeters();
        }

        if (
          successCount ===
          selectedMeterIds.length
        ) {

          setDeactivateOpen(false);
          setSelectedMeterIds([]);

          alert(
            successCount === 1
              ? "Water meter deactivated"
              : `${successCount} water meters deactivated`
          );
        }

      } finally {

        setDeactivateSubmitting(
          false
        );
      }
    };

  const formatType = (
    type
  ) =>
    type === "hot"
      ? "Hot Water"
      : "Cold Water";

  const formatDate = (
    value
  ) => {

    if (!value) {
      return "—";
    }

    return String(value)
      .slice(0, 10);
  };

  const formatReading = (
    value
  ) => {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    const storedValue =
      Number(value);

    if (
      !Number.isFinite(
        storedValue
      )
    ) {
      return String(value);
    }

    return (
      (storedValue / 1000)
        .toFixed(3)
        .replace(".", ",") +
      " m³"
    );
  };

  const getCalibrationStatus =
    (
      expiresAt
    ) =>
      calculateCalibrationStatus(
        expiresAt
      );

  return (
    <div>

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 22,
        }}
      >

        <div>

          <h1
            style={{
              margin: 0,
            }}
          >
            Water Meter Management
          </h1>

          <p
            style={{
              marginTop: 8,
              color:
                "var(--text)",
              lineHeight: 1.5,
            }}
          >
            Manage active and inactive
            apartment water meters.
          </p>

        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >

          <button
            type="button"
            onClick={
              loadPageData
            }
            style={secondaryButton}
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={() =>
              setAddOpen(true)
            }
            style={primaryButton}
          >
            Add Meter
          </button>

          <button
            type="button"
            onClick={
              openDeactivate
            }
            disabled={
              activeMeters.length ===
              0
            }
            style={{
              ...dangerButton,

              opacity:
                activeMeters.length ===
                0
                  ? 0.55
                  : 1,

              cursor:
                activeMeters.length ===
                0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            Deactivate
          </button>

        </div>

      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >

        <CalibrationSummaryCard
          label="Valid"
          value={
            calibrationSummary.valid
          }
          tone="success"
          active={
            filter.calibration ===
            "valid"
          }
          onClick={() =>
            setFilter(
              (current) => ({
                ...current,
                calibration:
                  current.calibration ===
                    "valid"
                    ? "all"
                    : "valid",
              })
            )
          }
        />

        <CalibrationSummaryCard
          label="Expires soon"
          value={
            calibrationSummary.warning
          }
          tone="warning"
          active={
            filter.calibration ===
            "warning"
          }
          onClick={() =>
            setFilter(
              (current) => ({
                ...current,
                calibration:
                  current.calibration ===
                    "warning"
                    ? "all"
                    : "warning",
              })
            )
          }
        />

        <CalibrationSummaryCard
          label="Expired"
          value={
            calibrationSummary.expired
          }
          tone="danger"
          active={
            filter.calibration ===
            "expired"
          }
          onClick={() =>
            setFilter(
              (current) => ({
                ...current,
                calibration:
                  current.calibration ===
                    "expired"
                    ? "all"
                    : "expired",
              })
            )
          }
        />

        <CalibrationSummaryCard
          label="No calibration"
          value={
            calibrationSummary.missing
          }
          tone="neutral"
          active={
            filter.calibration ===
            "missing"
          }
          onClick={() =>
            setFilter(
              (current) => ({
                ...current,
                calibration:
                  current.calibration ===
                    "missing"
                    ? "all"
                    : "missing",
              })
            )
          }
        />

      </div>

      <section
        style={{
          marginBottom: 18,
          padding: 14,
          border:
            "1px solid var(--border)",
          borderRadius: 14,
          background:
            "var(--surface)",
        }}
      >

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 10,
          }}
        >

          <input
            type="search"
            value={
              filter.search
            }
            onChange={(event) =>
              setFilter(
                (current) => ({
                  ...current,

                  search:
                    event.target.value,
                })
              )
            }
            placeholder="Search apartment, serial, riser..."
            style={fieldStyle}
          />

          <select
            value={filter.type}
            onChange={(event) =>
              setFilter(
                (current) => ({
                  ...current,

                  type:
                    event.target.value,
                })
              )
            }
            style={fieldStyle}
          >
            <option value="all">
              All types
            </option>
            <option value="cold">
              Cold Water
            </option>
            <option value="hot">
              Hot Water
            </option>
          </select>

          <select
            value={
              filter.status
            }
            onChange={(event) =>
              setFilter(
                (current) => ({
                  ...current,

                  status:
                    event.target.value,
                })
              )
            }
            style={fieldStyle}
          >
            <option value="all">
              All statuses
            </option>
            <option value="active">
              Active
            </option>
            <option value="inactive">
              Inactive
            </option>
          </select>

          <select
            value={
              filter.calibration
            }
            onChange={(event) =>
              setFilter(
                (current) => ({
                  ...current,

                  calibration:
                    event.target.value,
                })
              )
            }
            style={fieldStyle}
          >
            <option value="all">
              All calibration statuses
            </option>
            <option value="valid">
              Valid
            </option>
            <option value="warning">
              Expires soon
            </option>
            <option value="expired">
              Expired
            </option>
            <option value="missing">
              No calibration
            </option>
          </select>

        </div>

      </section>

      {loading ? (

        <div
          style={emptyState}
        >
          Loading water meters...
        </div>

      ) : filteredMeters.length ===
        0 ? (

        <div
          style={emptyState}
        >
          No water meters match the
          selected filters.
        </div>

      ) : isMobile ? (

        <div
          style={{
            display: "grid",
            gap: 14,
          }}
        >

          {groupedMeters.map(
            (apartment) => (

              <section
                key={
                  apartment
                    .apartment_id
                }
                style={apartmentCard}
              >

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap: 10,
                    marginBottom: 12,
                    paddingBottom: 10,
                    borderBottom:
                      "1px solid var(--border)",
                  }}
                >

                  <strong
                    style={{
                      color:
                        "var(--text-h)",
                      fontSize: 16,
                    }}
                  >
                    Apartment #
                    {
                      apartment
                        .apartment_number
                    }
                  </strong>

                  <span
                    style={countBadge}
                  >
                    {
                      apartment
                        .meters.length
                    }
                  </span>

                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                  }}
                >

                  {apartment
                    .meters.map(
                      (meter) => (

                        <MeterCard
                          key={
                            meter.id
                          }
                          meter={meter}
                          formatType={
                            formatType
                          }
                          formatDate={
                            formatDate
                          }
                          formatReading={
                            formatReading
                          }
                          getCalibrationStatus={
                            getCalibrationStatus
                          }
                          onOpenDocument={
                            openCalibrationDocument
                          }
                          onOpenCalibrationHistory={
                            openCalibrationHistory
                          }
                          onEdit={
                            openEditMeter
                          }
                        />

                      )
                    )}

                </div>

              </section>

            )
          )}

        </div>

      ) : (

        <div
          style={{
            overflowX: "auto",
            border:
              "1px solid var(--border)",
            borderRadius: 14,
            background:
              "var(--surface)",
          }}
        >

          <table
            style={{
              width: "100%",
              minWidth: 1450,
              borderCollapse:
                "collapse",
              fontSize: 13,
            }}
          >

            <thead>

              <tr
                style={{
                  background:
                    "var(--surface-soft)",
                }}
              >

                {[
                  "Apartment",
                  "Type / Location",
                  "Serial Number",
                  "Riser",
                  "Installed",
                  "Calibration",
                  "Expires",
                  "Calibration Status",
                  "Document",
                  "Last Reading",
                  "Last Date",
                  "Status",
                  "Actions",
                ].map(
                  (heading) => (

                    <th
                      key={heading}
                      style={tableHeader}
                    >
                      {heading}
                    </th>

                  )
                )}

              </tr>

            </thead>

            <tbody>

              {filteredMeters.map(
                (
                  meter,
                  index
                ) => (

                  <tr
                    key={meter.id}
                    style={{
                      background:
                        index % 2 === 0
                          ? "var(--surface)"
                          : "var(--surface-soft)",
                    }}
                  >

                    <td style={tableCellStrong}>
                      #
                      {
                        meter.apartment_number
                      }
                    </td>

                    <td style={tableCell}>
                      <div
                        style={{
                          fontWeight: 700,
                          color:
                            "var(--text-h)",
                        }}
                      >
                        {formatType(
                          meter.type
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: 2,
                          color:
                            "var(--text)",
                          fontSize: 11,
                        }}
                      >
                        {meter.location}
                      </div>
                    </td>

                    <td style={tableCellStrong}>
                      <div>
                        {meter.serial_number ||
                          "—"}
                      </div>

                      {(meter.manufacturer ||
                        meter.model) && (

                        <div
                          style={{
                            marginTop: 2,
                            color:
                              "var(--text)",
                            fontSize: 10,
                            fontWeight: 500,
                          }}
                        >
                          {[
                            meter.manufacturer,
                            meter.model,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>

                      )}
                    </td>

                    <td
                      style={{
                        ...tableCell,
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                        fontSize: 11,
                      }}
                    >
                      {meter.riser}
                    </td>

                    <td style={tableCell}>
                      {formatDate(
                        meter.installed_at
                      )}
                    </td>

                    <td style={tableCell}>
                      {formatDate(
                        meter.calibration_date
                      )}
                    </td>

                    <td style={tableCell}>
                      {formatDate(
                        meter.calibration_expires_at
                      )}
                    </td>

                    <td style={tableCell}>
                      <button
                        type="button"
                        onClick={() =>
                          openCalibrationHistory(
                            meter
                          )
                        }
                        style={plainButton}
                      >
                        <CalibrationBadge
                          status={
                            getCalibrationStatus(
                              meter.calibration_expires_at
                            )
                          }
                        />
                      </button>
                    </td>

                    <td style={tableCell}>
                      {meter.calibration_id ? (

                        <div
                          style={{
                            display: "grid",
                            gap: 4,
                            justifyItems: "start",
                          }}
                        >

                          <button
                            type="button"
                            onClick={() =>
                              openCalibrationDocument(
                                meter.calibration_id,
                                meter.calibration_document_name
                              )
                            }
                            style={documentButton}
                          >
                            View
                          </button>

                          {meter
                            .calibration_certificate_number && (

                            <span
                              style={{
                                fontSize: 10,
                                color:
                                  "var(--text)",
                              }}
                            >
                              No.{" "}
                              {
                                meter
                                  .calibration_certificate_number
                              }
                            </span>

                          )}

                          {meter
                            .calibration_laboratory && (

                            <span
                              style={{
                                maxWidth: 150,
                                fontSize: 10,
                                color:
                                  "var(--text)",
                                overflowWrap:
                                  "anywhere",
                              }}
                            >
                              {
                                meter
                                  .calibration_laboratory
                              }
                            </span>

                          )}

                        </div>

                      ) : (
                        "—"
                      )}
                    </td>

                    <td
                      style={{
                        ...tableCellStrong,
                        textAlign: "left",
                        fontVariantNumeric:
                          "tabular-nums",
                      }}
                    >
                      {formatReading(
                        meter.last_reading
                      )}
                    </td>

                    <td style={tableCell}>
                      {formatDate(
                        meter.last_reading_date
                      )}
                    </td>

                    <td style={tableCell}>
                      <StatusBadge
                        active={
                          meter.status ===
                          "active"
                        }
                      />
                    </td>

                    <td style={tableCell}>
                      <button
                        type="button"
                        onClick={() =>
                          openEditMeter(
                            meter
                          )
                        }
                        style={secondaryButton}
                      >
                        Edit
                      </button>
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      )}

      <Modal
        open={addOpen}
        title="Add Water Meter"
        onClose={() => {

          if (!addSubmitting) {
            setAddOpen(false);
          }
        }}
      >

        <div
          style={{
            display: "grid",
            gap: 12,
          }}
        >

          <SectionHeading>
            General
          </SectionHeading>

          <FormField
            label="Apartment"
          >
            <select
              value={
                addForm.apartmentId
              }
              disabled={
                addSubmitting
              }
              onChange={(event) =>
                handleApartmentChange(
                  event.target.value
                )
              }
              style={fieldStyle}
            >
              <option value="">
                Select apartment
              </option>

              {apartments.map(
                (apartment) => (

                  <option
                    key={
                      apartment.id
                    }
                    value={
                      apartment.id
                    }
                  >
                    Apartment #
                    {apartment.number}
                  </option>

                )
              )}
            </select>
          </FormField>

          <FormField
            label="Riser"
          >
            <select
              value={
                addForm.apartmentRiserId
              }
              disabled={
                addSubmitting ||
                risersLoading ||
                !addForm.apartmentId
              }
              onChange={(event) =>
                setAddForm(
                  (current) => ({
                    ...current,

                    apartmentRiserId:
                      event.target.value,
                  })
                )
              }
              style={fieldStyle}
            >
              <option value="">
                {risersLoading
                  ? "Loading risers..."
                  : "Select riser"}
              </option>

              {apartmentRisers
                .filter(
                  (riser) => {

                    const systemType =
                      String(
                        riser.system_type ||
                        ""
                      )
                        .trim()
                        .toLowerCase();

                    const riserCode =
                      String(
                        riser.riser_code ||
                        ""
                      )
                        .trim()
                        .toLowerCase();

                    const combinedType =
                      `${systemType} ${riserCode}`;

                    const isCold =
                      /(^|[^a-z])(cw|cold|cold_water|cold-water)([^a-z]|$)/.test(
                        combinedType
                      );

                    const isHot =
                      /(^|[^a-z])(hw|hot|hot_water|hot-water)([^a-z]|$)/.test(
                        combinedType
                      );

                    if (
                      !isCold &&
                      !isHot
                    ) {
                      return true;
                    }

                    return (
                      addForm.type ===
                        "cold"
                        ? isCold
                        : isHot
                    );
                  }
                )
                .map(
                  (riser) => (

                    <option
                      key={
                        riser.apartment_riser_id
                      }
                      value={
                        riser.apartment_riser_id
                      }
                    >
                      {riser.riser_code}
                      {riser.local_label
                        ? ` · ${riser.local_label}`
                        : ""}
                    </option>

                  )
                )}
            </select>
          </FormField>

          <FormField
            label="Type"
          >
            <select
              value={
                addForm.type
              }
              disabled={
                addSubmitting
              }
              onChange={(event) =>
                setAddForm(
                  (current) => ({
                    ...current,

                    type:
                      event.target.value,

                    apartmentRiserId:
                      "",
                  })
                )
              }
              style={fieldStyle}
            >
              <option value="cold">
                Cold Water
              </option>
              <option value="hot">
                Hot Water
              </option>
            </select>
          </FormField>

          <FormField
            label="Serial Number"
          >
            <input
              type="text"
              value={
                addForm.serialNumber
              }
              disabled={
                addSubmitting
              }
              onChange={(event) =>
                setAddForm(
                  (current) => ({
                    ...current,

                    serialNumber:
                      event.target.value,
                  })
                )
              }
              style={fieldStyle}
            />
          </FormField>

          <FormField
            label="Manufacturer"
          >
            <input
              type="text"
              value={
                addForm.manufacturer
              }
              disabled={
                addSubmitting
              }
              onChange={(event) =>
                setAddForm(
                  (current) => ({
                    ...current,
                    manufacturer:
                      event.target.value,
                  })
                )
              }
              style={fieldStyle}
            />
          </FormField>

          <FormField
            label="Model"
          >
            <input
              type="text"
              value={
                addForm.model
              }
              disabled={
                addSubmitting
              }
              onChange={(event) =>
                setAddForm(
                  (current) => ({
                    ...current,
                    model:
                      event.target.value,
                  })
                )
              }
              style={fieldStyle}
            />
          </FormField>

          <SectionHeading>
            Installation
          </SectionHeading>

          <FormField
            label="Installed Date"
          >
            <input
              type="date"
              value={
                addForm.installedAt
              }
              disabled={
                addSubmitting
              }
              onChange={(event) =>
                setAddForm(
                  (current) => ({
                    ...current,

                    installedAt:
                      event.target.value,

                    calibrationDate:
                      current
                        .calibrationSameAsInstallation
                        ? event.target.value
                        : current.calibrationDate,
                  })
                )
              }
              style={fieldStyle}
            />
          </FormField>

          <FormField
            label="Initial Reading, m³"
          >
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,000"
              value={
                addForm.initialReading
              }
              disabled={
                addSubmitting
              }
              onChange={(event) =>
                setAddForm(
                  (current) => ({
                    ...current,

                    initialReading:
                      event.target.value,
                  })
                )
              }
              style={fieldStyle}
            />

            <span
              style={{
                color:
                  "var(--text)",
                fontSize: 11,
              }}
            >
              Reading at installation,
              in cubic metres.
            </span>
          </FormField>

          <div
            style={{
              marginTop: 6,
              paddingTop: 14,
              borderTop:
                "1px solid var(--border)",
            }}
          >

            <SectionHeading
              compact
            >
              Calibration
            </SectionHeading>

            <FormField
              label="Calibration Certificate Available?"
            >
              <select
                value={
                  addForm.certificateAvailable
                    ? "yes"
                    : "no"
                }
                disabled={
                  addSubmitting
                }
                onChange={(event) =>
                  setAddForm(
                    (current) => ({
                      ...current,
                      certificateAvailable:
                        event.target.value ===
                        "yes",
                    })
                  )
                }
                style={fieldStyle}
              >
                <option value="yes">
                  Yes
                </option>
                <option value="no">
                  No / unavailable
                </option>
              </select>
            </FormField>

            {!addForm.certificateAvailable && (
              <div
                style={{
                  padding: 10,
                  border:
                    "1px solid #f59e0b",
                  borderRadius: 9,
                  background: "#fffbeb",
                  color: "#92400e",
                  fontSize: 12,
                  lineHeight: 1.45,
                }}
              >
                The meter can be registered without a calibration document. A separate confirmation will be requested before saving.
              </div>
            )}

            {addForm.certificateAvailable && (
              <>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                color:
                  "var(--text-h)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={
                  addForm
                    .calibrationSameAsInstallation
                }
                disabled={
                  addSubmitting
                }
                onChange={(event) =>
                  setAddForm(
                    (current) => ({
                      ...current,

                      calibrationSameAsInstallation:
                        event.target.checked,

                      calibrationDate:
                        event.target.checked
                          ? current.installedAt
                          : current.calibrationDate,
                    })
                  )
                }
              />

              Calibration performed
              on installation date
            </label>

            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >

              <FormField
                label="Calibration Date"
              >
                <input
                  type="date"
                  value={
                    addForm.calibrationDate
                  }
                  disabled={
                    addSubmitting ||
                    addForm
                      .calibrationSameAsInstallation
                  }
                  onChange={(event) =>
                    setAddForm(
                      (current) => ({
                        ...current,

                        calibrationDate:
                          event.target.value,
                      })
                    )
                  }
                  style={fieldStyle}
                />
              </FormField>

              <FormField
                label="Validity Period"
              >
                <select
                  value={
                    addForm.validityPreset
                  }
                  disabled={
                    addSubmitting
                  }
                  onChange={(event) =>
                    setAddForm(
                      (current) => ({
                        ...current,

                        validityPreset:
                          event.target.value,

                        validityMonths:
                          event.target.value ===
                            "custom"
                            ? current.validityMonths
                            : event.target.value,
                      })
                    )
                  }
                  style={fieldStyle}
                >
                  <option value="12">
                    12 months
                  </option>
                  <option value="24">
                    24 months
                  </option>
                  <option value="48">
                    48 months
                  </option>
                  <option value="60">
                    60 months
                  </option>
                  <option value="72">
                    72 months
                  </option>
                  <option value="custom">
                    Custom...
                  </option>
                </select>

                {addForm.validityPreset ===
                  "custom" && (

                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={
                      addForm.validityMonths
                    }
                    disabled={
                      addSubmitting
                    }
                    onChange={(event) =>
                      setAddForm(
                        (current) => ({
                          ...current,

                          validityMonths:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Months"
                    style={fieldStyle}
                  />

                )}
              </FormField>

              <FormField
                label="Expires At"
              >
                <input
                  type="text"
                  value={
                    calculatedExpiresAt ||
                    "Calculated automatically"
                  }
                  readOnly
                  style={{
                    ...fieldStyle,

                    background:
                      calculatedExpiresAt
                        ? getCalibrationStatus(
                            calculatedExpiresAt
                          ).tone ===
                            "danger"
                          ? "#fee2e2"
                          : getCalibrationStatus(
                              calculatedExpiresAt
                            ).tone ===
                              "warning"
                            ? "#fef3c7"
                            : "#dcfce7"
                        : "var(--surface-muted)",

                    color:
                      calculatedExpiresAt
                        ? "#111827"
                        : "var(--text)",
                  }}
                />
              </FormField>

              <FormField
                label="Certificate Number"
              >
                <input
                  type="text"
                  value={
                    addForm.certificateNumber
                  }
                  disabled={
                    addSubmitting
                  }
                  onChange={(event) =>
                    setAddForm(
                      (current) => ({
                        ...current,

                        certificateNumber:
                          event.target.value,
                      })
                    )
                  }
                  style={fieldStyle}
                />
              </FormField>

              <FormField
                label="Calibration Laboratory"
              >
                <input
                  type="text"
                  value={
                    addForm.calibrationLaboratory
                  }
                  disabled={
                    addSubmitting
                  }
                  onChange={(event) =>
                    setAddForm(
                      (current) => ({
                        ...current,

                        calibrationLaboratory:
                          event.target.value,
                      })
                    )
                  }
                  style={fieldStyle}
                />
              </FormField>

              <FormField
                label="Calibration Document"
              >
                <input
                  type="file"
                  accept=".pdf,.edoc,.asice,application/pdf,application/octet-stream"
                  disabled={
                    addSubmitting
                  }
                  onChange={(event) =>
                    setAddForm(
                      (current) => ({
                        ...current,

                        calibrationDocument:
                          event.target.files?.[0] ||
                          null,
                      })
                    )
                  }
                  style={fieldStyle}
                />

                <span
                  style={{
                    color:
                      "var(--text)",
                    fontSize: 11,
                  }}
                >
                  Supported formats:
                  PDF, eDoc, ASiC-E.
                  Maximum size: 10 MB.
                </span>
              </FormField>

              <FormField
                label="Calibration Notes"
              >
                <textarea
                  rows={2}
                  value={
                    addForm.calibrationNotes
                  }
                  disabled={
                    addSubmitting
                  }
                  onChange={(event) =>
                    setAddForm(
                      (current) => ({
                        ...current,

                        calibrationNotes:
                          event.target.value,
                      })
                    )
                  }
                  style={{
                    ...fieldStyle,
                    resize: "vertical",
                    fontFamily:
                      "inherit",
                  }}
                />
              </FormField>

            </div>
              </>
            )}

          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 8,
              marginTop: 4,
            }}
          >

            <button
              type="button"
              onClick={() =>
                setAddOpen(false)
              }
              disabled={
                addSubmitting
              }
              style={secondaryButton}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={
                handleAddMeter
              }
              disabled={
                addSubmitting
              }
              style={{
                ...primaryButton,

                opacity:
                  addSubmitting
                    ? 0.65
                    : 1,
              }}
            >
              {addSubmitting
                ? "Adding..."
                : "Add Meter"}
            </button>

          </div>

        </div>

      </Modal>


      <Modal
        open={editOpen}
        title="Edit Water Meter"
        onClose={() => {
          if (!editSubmitting) {
            setEditOpen(false);
          }
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 12,
          }}
        >
          <FormField label="Type">
            <select
              value={editForm.type}
              disabled={editSubmitting}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  type: event.target.value,
                  apartmentRiserId: "",
                }))
              }
              style={fieldStyle}
            >
              <option value="cold">Cold Water</option>
              <option value="hot">Hot Water</option>
            </select>
          </FormField>

          <FormField label="Riser">
            <select
              value={editForm.apartmentRiserId}
              disabled={editSubmitting}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  apartmentRiserId: event.target.value,
                }))
              }
              style={fieldStyle}
            >
              <option value="">Not assigned</option>
              {editRisers
                .filter((riser) => {
                  const value = `${riser.system_type || ""} ${riser.riser_code || ""}`.toLowerCase();
                  const isCold = /(^|[^a-z])(cw|cold|cold_water|cold-water)([^a-z]|$)/.test(value);
                  const isHot = /(^|[^a-z])(hw|hot|hot_water|hot-water)([^a-z]|$)/.test(value);
                  return editForm.type === "cold" ? isCold : isHot;
                })
                .map((riser) => (
                  <option
                    key={riser.apartment_riser_id}
                    value={riser.apartment_riser_id}
                  >
                    {riser.riser_code}
                    {riser.local_label ? ` · ${riser.local_label}` : ""}
                  </option>
                ))}
            </select>
          </FormField>

          <FormField label="Serial Number">
            <input
              type="text"
              value={editForm.serialNumber}
              disabled={editSubmitting}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  serialNumber: event.target.value,
                }))
              }
              style={fieldStyle}
            />
          </FormField>

          <FormField label="Manufacturer">
            <input type="text" value={editForm.manufacturer} disabled={editSubmitting} onChange={(event) => setEditForm((current) => ({...current, manufacturer: event.target.value}))} style={fieldStyle} />
          </FormField>

          <FormField label="Model">
            <input type="text" value={editForm.model} disabled={editSubmitting} onChange={(event) => setEditForm((current) => ({...current, model: event.target.value}))} style={fieldStyle} />
          </FormField>

          <FormField label="Installed Date (optional)">
            <input type="date" value={editForm.installedAt} disabled={editSubmitting} onChange={(event) => setEditForm((current) => ({...current, installedAt: event.target.value}))} style={fieldStyle} />
          </FormField>

          <FormField label="Initial Reading, m³">
            <input type="text" inputMode="decimal" placeholder="0,000" value={editForm.initialReading} disabled={editSubmitting} onChange={(event) => setEditForm((current) => ({...current, initialReading: event.target.value}))} style={fieldStyle} />
          </FormField>

          <FormField label="Initial Reading Date">
            <input type="date" value={editForm.initialReadingDate} disabled={editSubmitting} onChange={(event) => setEditForm((current) => ({...current, initialReadingDate: event.target.value}))} style={fieldStyle} />
          </FormField>

          <FormField label="Reason for correction">
            <textarea rows={3} value={editForm.correctionReason} disabled={editSubmitting} onChange={(event) => setEditForm((current) => ({...current, correctionReason: event.target.value}))} style={{...fieldStyle, resize: "vertical"}} />
            <span style={{color: "var(--text)", fontSize: 11}}>Required when the initial reading or its date is changed.</span>
          </FormField>

          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8}}>
            <button type="button" onClick={() => setEditOpen(false)} disabled={editSubmitting} style={secondaryButton}>Cancel</button>
            <button type="button" onClick={handleEditMeter} disabled={editSubmitting} style={{...primaryButton, opacity: editSubmitting ? 0.65 : 1}}>
              {editSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={calibrationOpen}
        title={
          selectedCalibrationMeter
            ? `Calibration History · ${selectedCalibrationMeter.serial_number || "Meter"}`
            : "Calibration History"
        }
        onClose={
          closeCalibrationHistory
        }
      >

        <div
          style={{
            display: "grid",
            gap: 16,
          }}
        >

          <section
            style={{
              display: "grid",
              gap: 10,
              padding: 12,
              border:
                "1px solid var(--border)",
              borderRadius: 12,
              background:
                "var(--surface-soft)",
            }}
          >

            <strong
              style={{
                color:
                  "var(--text-h)",
              }}
            >
              Add Calibration
            </strong>

            <FormField
              label="Calibration Date"
            >
              <input
                type="date"
                value={
                  calibrationForm.calibrationDate
                }
                onChange={(event) =>
                  setCalibrationForm(
                    (current) => ({
                      ...current,
                      calibrationDate:
                        event.target.value,
                    })
                  )
                }
                style={fieldStyle}
              />
            </FormField>

            <FormField
              label="Validity Period, months"
            >
              <input
                type="number"
                min="1"
                max="120"
                value={
                  calibrationForm.validityMonths
                }
                onChange={(event) =>
                  setCalibrationForm(
                    (current) => ({
                      ...current,
                      validityMonths:
                        event.target.value,
                    })
                  )
                }
                style={fieldStyle}
              />
            </FormField>

            <FormField
              label="Certificate Number"
            >
              <input
                type="text"
                value={
                  calibrationForm.certificateNumber
                }
                onChange={(event) =>
                  setCalibrationForm(
                    (current) => ({
                      ...current,
                      certificateNumber:
                        event.target.value,
                    })
                  )
                }
                style={fieldStyle}
              />
            </FormField>

            <FormField
              label="Calibration Laboratory"
            >
              <input
                type="text"
                value={
                  calibrationForm.calibrationLaboratory
                }
                onChange={(event) =>
                  setCalibrationForm(
                    (current) => ({
                      ...current,
                      calibrationLaboratory:
                        event.target.value,
                    })
                  )
                }
                style={fieldStyle}
              />
            </FormField>

            <FormField
              label="Calibration Document"
            >
              <input
                type="file"
                accept=".pdf,.edoc,.asice"
                onChange={(event) =>
                  setCalibrationForm(
                    (current) => ({
                      ...current,
                      document:
                        event.target.files?.[0] ||
                        null,
                    })
                  )
                }
                style={fieldStyle}
              />
            </FormField>

            <FormField
              label="Notes"
            >
              <textarea
                rows={3}
                value={
                  calibrationForm.notes
                }
                onChange={(event) =>
                  setCalibrationForm(
                    (current) => ({
                      ...current,
                      notes:
                        event.target.value,
                    })
                  )
                }
                style={{
                  ...fieldStyle,
                  resize: "vertical",
                }}
              />
            </FormField>

            <button
              type="button"
              onClick={
                handleAddCalibration
              }
              disabled={
                calibrationSubmitting
              }
              style={{
                ...primaryButton,
                opacity:
                  calibrationSubmitting
                    ? 0.65
                    : 1,
              }}
            >
              {calibrationSubmitting
                ? "Saving..."
                : "Add Calibration"}
            </button>

          </section>

          <section>

            <strong
              style={{
                color:
                  "var(--text-h)",
              }}
            >
              History
            </strong>

            <div
              style={{
                display: "grid",
                gap: 10,
                marginTop: 10,
              }}
            >

              {meterCalibrationsLoading ? (

                <div style={emptyState}>
                  Loading...
                </div>

              ) : !meterCalibrations
                  ?.calibrations
                  ?.length ? (

                <div style={emptyState}>
                  No calibration history.
                </div>

              ) : (

                meterCalibrations.calibrations.map(
                  (item) => (

                    <div
                      key={item.id}
                      style={{
                        padding: 12,
                        border:
                          "1px solid var(--border)",
                        borderRadius: 10,
                        background:
                          "var(--surface)",
                      }}
                    >

                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >

                        <strong
                          style={{
                            color:
                              "var(--text-h)",
                          }}
                        >
                          {formatDate(
                            item.calibration_date
                          )}
                        </strong>

                        <CalibrationBadge
                          status={
                            getCalibrationStatus(
                              item.expires_at
                            )
                          }
                        />

                      </div>

                      <div
                        style={{
                          display: "grid",
                          gap: 4,
                          marginTop: 8,
                          fontSize: 12,
                        }}
                      >
                        <span>
                          Expires:{" "}
                          {formatDate(
                            item.expires_at
                          )}
                        </span>

                        <span>
                          Certificate:{" "}
                          {item.certificate_number ||
                            "—"}
                        </span>

                        <span>
                          Laboratory:{" "}
                          {item.calibration_laboratory ||
                            "—"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          openCalibrationDocument(
                            item.id,
                            item.certificate_file_name
                          )
                        }
                        style={{
                          ...documentButton,
                          marginTop: 10,
                        }}
                      >
                        View Document
                      </button>

                    </div>

                  )
                )

              )}

            </div>

          </section>

        </div>

      </Modal>

      <Modal
        open={deactivateOpen}
        title="Deactivate Water Meters"
        onClose={() => {

          if (
            !deactivateSubmitting
          ) {
            setDeactivateOpen(false);
          }
        }}
      >

        <div
          style={{
            display: "grid",
            gap: 12,
          }}
        >

          <p
            style={{
              color:
                "var(--text)",
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            Select one or more active
            water meters. Historical
            readings will be preserved.
          </p>

          <div
            style={{
              maxHeight: 320,
              overflowY: "auto",
              display: "grid",
              gap: 8,
              paddingRight: 4,
            }}
          >

            {activeMeters.map(
              (meter) => (

                <label
                  key={meter.id}
                  style={{
                    display: "flex",
                    alignItems:
                      "flex-start",
                    gap: 10,
                    padding: 10,
                    border:
                      "1px solid var(--border)",
                    borderRadius: 9,
                    background:
                      selectedMeterIds
                        .includes(
                          meter.id
                        )
                        ? "var(--surface-muted)"
                        : "var(--surface)",
                    cursor: "pointer",
                  }}
                >

                  <input
                    type="checkbox"
                    checked={
                      selectedMeterIds
                        .includes(
                          meter.id
                        )
                    }
                    disabled={
                      deactivateSubmitting
                    }
                    onChange={() =>
                      toggleSelectedMeter(
                        meter.id
                      )
                    }
                  />

                  <span
                    style={{
                      minWidth: 0,
                    }}
                  >

                    <strong
                      style={{
                        color:
                          "var(--text-h)",
                        fontSize: 13,
                      }}
                    >
                      Apartment #
                      {
                        meter.apartment_number
                      }
                      {" · "}
                      {formatType(
                        meter.type
                      )}
                    </strong>

                    <span
                      style={{
                        display: "block",
                        marginTop: 2,
                        color:
                          "var(--text)",
                        fontSize: 11,
                      }}
                    >
                      Serial{" "}
                      {
                        meter.serial_number ||
                        "—"
                      }
                      {" · "}
                      {meter.riser}
                    </span>

                  </span>

                </label>

              )
            )}

          </div>

          <FormField
            label="Reason"
          >
            <select
              value={
                deactivateReason
              }
              disabled={
                deactivateSubmitting
              }
              onChange={(event) =>
                setDeactivateReason(
                  event.target.value
                )
              }
              style={fieldStyle}
            >
              <option value="replacement">
                Replacement
              </option>
              <option value="fault">
                Fault
              </option>
              <option value="removed">
                Removed
              </option>
              <option value="other">
                Other
              </option>
            </select>
          </FormField>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 8,
            }}
          >

            <button
              type="button"
              onClick={() =>
                setDeactivateOpen(false)
              }
              disabled={
                deactivateSubmitting
              }
              style={secondaryButton}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={
                handleDeactivate
              }
              disabled={
                deactivateSubmitting
              }
              style={{
                ...dangerButton,

                opacity:
                  deactivateSubmitting
                    ? 0.65
                    : 1,
              }}
            >
              {deactivateSubmitting
                ? "Deactivating..."
                : "Deactivate"}
            </button>

          </div>

        </div>

      </Modal>

    </div>
  );
}

function calculateCalibrationStatus(
  expiresAt
) {

  if (!expiresAt) {
    return {
      key: "missing",
      label: "No calibration",
      tone: "neutral",
    };
  }

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const expiry =
    new Date(
      `${expiresAt}T00:00:00`
    );

  if (
    Number.isNaN(
      expiry.getTime()
    )
  ) {
    return {
      key: "missing",
      label: "No calibration",
      tone: "neutral",
    };
  }

  const daysRemaining =
    Math.ceil(
      (
        expiry.getTime() -
        today.getTime()
      ) /
      86400000
    );

  if (daysRemaining < 0) {
    return {
      key: "expired",
      label: "Expired",
      tone: "danger",
    };
  }

  if (
    daysRemaining <= 30
  ) {
    return {
      key: "warning",
      label:
        `Expires in ${daysRemaining} d`,
      tone: "warning",
    };
  }

  return {
    key: "valid",
    label: "Valid",
    tone: "success",
  };
}

function CalibrationSummaryCard({
  label,
  value,
  tone,
  active,
  onClick,
}) {

  const tones = {

    success: {
      background: "#dcfce7",
      color: "#166534",
      border: "#86efac",
    },

    warning: {
      background: "#fef3c7",
      color: "#92400e",
      border: "#fcd34d",
    },

    danger: {
      background: "#fee2e2",
      color: "#991b1b",
      border: "#fca5a5",
    },

    neutral: {
      background:
        "var(--surface)",
      color:
        "var(--text-h)",
      border:
        "var(--border)",
    },
  };

  const style =
    tones[tone] ||
    tones.neutral;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: 14,
        border:
          `2px solid ${
            active
              ? style.color
              : style.border
          }`,
        borderRadius: 14,
        background:
          style.background,
        color:
          style.color,
        textAlign: "left",
        cursor: "pointer",
        boxShadow:
          active
            ? "0 0 0 2px rgba(37,99,235,.12)"
            : "none",
      }}
    >

      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          opacity: 0.85,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: 24,
          lineHeight: 1,
          fontWeight: 800,
        }}
      >
        {value}
      </div>

    </button>
  );
}

function SectionHeading({
  children,
  compact = false,
}) {

  return (
    <div
      style={{
        marginTop:
          compact ? 0 : 6,
        paddingTop:
          compact ? 0 : 14,
        borderTop:
          compact
            ? "none"
            : "1px solid var(--border)",
        color:
          "var(--text-h)",
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      {children}
    </div>
  );
}

function FormField({
  label,
  children,
}) {

  return (
    <label
      style={{
        display: "grid",
        gap: 5,
      }}
    >

      <span
        style={{
          color:
            "var(--text-h)",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {label}
      </span>

      {children}

    </label>
  );
}

function StatusBadge({
  active,
}) {

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 9px",
        borderRadius: 999,
        background:
          active
            ? "#dcfce7"
            : "var(--surface-muted)",
        color:
          active
            ? "#166534"
            : "var(--text)",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {active
        ? "Active"
        : "Inactive"}
    </span>
  );
}

function MeterCard({
  meter,
  formatType,
  formatDate,
  formatReading,
  getCalibrationStatus,
  onOpenDocument,
  onOpenCalibrationHistory,
  onEdit,
}) {

  return (
    <div
      style={{
        padding: 12,
        border:
          "1px solid var(--border)",
        borderRadius: 12,
        background:
          "var(--surface-soft)",
      }}
    >

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
          gap: 10,
          marginBottom: 10,
        }}
      >

        <div>

          <div
            style={{
              color:
                "var(--text-h)",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {formatType(
              meter.type
            )}
          </div>

          <div
            style={{
              marginTop: 2,
              color:
                "var(--text)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {meter.location}
          </div>

        </div>

        <StatusBadge
          active={
            meter.status ===
            "active"
          }
        />

      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "auto minmax(0, 1fr)",
          columnGap: 10,
          rowGap: 5,
          fontSize: 12,
        }}
      >

        {[
          [
            "Serial Number",
            meter.serial_number ||
              "—",
          ],
          [
            "Manufacturer",
            meter.manufacturer ||
              "—",
          ],
          [
            "Model",
            meter.model ||
              "—",
          ],
          [
            "Riser",
            meter.riser,
          ],
          [
            "Installed",
            formatDate(
              meter.installed_at
            ),
          ],
          [
            "Calibration",
            formatDate(
              meter.calibration_date
            ),
          ],
          [
            "Expires",
            formatDate(
              meter.calibration_expires_at
            ),
          ],
          [
            "Calibration Status",
            getCalibrationStatus(
              meter.calibration_expires_at
            ).label,
          ],
          [
            "Certificate Number",
            meter
              .calibration_certificate_number ||
              "—",
          ],
          [
            "Laboratory",
            meter
              .calibration_laboratory ||
              "—",
          ],
          [
            "Last Reading",
            formatReading(
              meter.last_reading
            ),
          ],
          [
            "Last Date",
            formatDate(
              meter.last_reading_date
            ),
          ],
        ].map(
          ([
            label,
            value,
          ]) => (

            <>
              <span
                key={
                  `${label}-label`
                }
                style={{
                  color:
                    "var(--text)",
                }}
              >
                {label}
              </span>

              <span
                key={
                  `${label}-value`
                }
                style={{
                  color:
                    "var(--text-h)",
                  textAlign: "right",
                  fontWeight: 600,
                  overflowWrap:
                    "anywhere",
                  fontVariantNumeric:
                    "tabular-nums",
                }}
              >
                {value}
              </span>
            </>

          )
        )}

      </div>

      <button
        type="button"
        onClick={() =>
          onEdit(meter)
        }
        style={{
          ...secondaryButton,
          width: "100%",
          marginTop: 10,
        }}
      >
        Edit Meter
      </button>

      <button
        type="button"
        onClick={() =>
          onOpenCalibrationHistory(
            meter
          )
        }
        style={{
          ...secondaryButton,
          width: "100%",
          marginTop: 10,
        }}
      >
        Calibration History
      </button>

      {meter.calibration_id && (

        <button
          type="button"
          onClick={() =>
            onOpenDocument(
              meter.calibration_id,
              meter.calibration_document_name
            )
          }
          style={{
            ...documentButton,
            width: "100%",
            marginTop: 10,
          }}
        >
          View Calibration Document
        </button>

      )}

    </div>
  );
}

function CalibrationBadge({
  status,
}) {

  const styles = {

    success: {
      background: "#dcfce7",
      color: "#166534",
    },

    warning: {
      background: "#fef3c7",
      color: "#92400e",
    },

    danger: {
      background: "#fee2e2",
      color: "#991b1b",
    },

    neutral: {
      background:
        "var(--surface-muted)",
      color:
        "var(--text)",
    },
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: "nowrap",
        ...styles[
          status?.tone ||
          "neutral"
        ],
      }}
    >
      {status?.label ||
        "No calibration"}
    </span>
  );
}

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 10px",
  border:
    "1px solid var(--input-border)",
  borderRadius: 9,
  background:
    "var(--input-bg)",
  color:
    "var(--input-text)",
  fontSize: 13,
};

const primaryButton = {
  padding: "10px 14px",
  border: "none",
  borderRadius: 9,
  background: "#2563eb",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButton = {
  padding: "10px 14px",
  border:
    "1px solid var(--border)",
  borderRadius: 9,
  background:
    "var(--surface)",
  color:
    "var(--text-h)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const dangerButton = {
  padding: "10px 14px",
  border: "none",
  borderRadius: 9,
  background: "#dc2626",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const plainButton = {
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: "pointer",
};

const documentButton = {
  padding: "7px 10px",
  border:
    "1px solid #2563eb",
  borderRadius: 8,
  background:
    "var(--surface)",
  color: "#2563eb",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};

const emptyState = {
  padding: 24,
  border:
    "1px solid var(--border)",
  borderRadius: 14,
  background:
    "var(--surface)",
  color:
    "var(--text)",
};

const apartmentCard = {
  padding: 14,
  border:
    "1px solid var(--border)",
  borderRadius: 16,
  background:
    "var(--surface)",
  boxShadow:
    "var(--shadow)",
};

const countBadge = {
  minWidth: 28,
  padding: "4px 8px",
  borderRadius: 999,
  background:
    "var(--surface-muted)",
  color:
    "var(--text)",
  textAlign: "center",
  fontSize: 11,
  fontWeight: 700,
};

const tableHeader = {
  padding: "10px 12px",
  borderBottom:
    "1px solid var(--border)",
  color:
    "var(--text-h)",
  fontWeight: 700,
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tableCell = {
  padding: "10px 12px",
  borderBottom:
    "1px solid var(--border-soft)",
  color:
    "var(--text)",
  verticalAlign: "middle",
};

const tableCellStrong = {
  ...tableCell,
  color:
    "var(--text-h)",
  fontWeight: 600,
};
