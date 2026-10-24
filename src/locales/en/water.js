const water = {
  resident: {
    title: "Water Meters",
    subtitle: "Submit the current values shown on your water meters.",
    noMeters: "No water meters found.",
    apartment: "Apartment",
    notAssigned: "Not assigned",
    meterCount: {
      one: "{{count}} meter",
      other: "{{count}} meters",
    },

    period: {
      statusTitle: "Water reading collection status",
      openTitle: "Water reading collection is open",
      closedTitle: "Water reading collection is closed",
      loading: "Loading water reading collection period...",
      loadFailed: "Water reading collection period could not be loaded.",
      unavailable: "Water reading collection period is not available.",
      openUntil: "You can submit readings until {{date}}.",
      opensOn: "The next collection period opens on {{date}}.",
      closedOn: "The last collection period closed on {{date}}.",
    },
  },

  card: {
    water: "Water",
    coldWater: "Cold Water",
    hotWater: "Hot Water",
    customWater: "{{type}} Water",
    riser: "Riser",
    serialNumber: "Serial number",
    currentReading: "Current reading",
    lastSubmitted: "Last submitted",
    newReading: "New reading, m³",
    submit: "Submit",
    submitting: "Submitting...",
    inputHint: "Enter the full meter value. Digits before the comma are cubic metres; three digits after it are litres.",
    viewHistory: "View history",
  },

  history: {
    title: "Meter History",
    typeHistory: "{{type}} History",
    waterMeter: "Water Meter",
    loading: "Loading history...",
    apartment: "Apartment",
    noPreviousReadings: "No previous readings.",
    date: "Date",
    reading: "Reading",
    consumption: "Consumption",
    correct: "Correct",
    correctLatestReading: "Correct latest reading",
    correctedReading: "Corrected reading, m³",
    correctionReason: "Correction reason",
    otherReason: "Other reason",
    describeReason: "Describe the reason",
    enterCorrectionReason: "Enter correction reason",
    cancel: "Cancel",
    saving: "Saving...",
    saveCorrection: "Save correction",
    close: "Close",

    reasons: {
      incorrectDigit: "Incorrect digit entered",
      wrongMeter: "Wrong meter selected",
      decimalPoint: "Decimal point error",
      other: "Other",
    },
  },
};

export default water;
