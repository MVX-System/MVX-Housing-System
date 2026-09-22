const findings = {
  resident: {
    title: "Test Findings",
    subtitle:
      "Report issues found while testing MVX TEST and follow their status.",
    newFinding: "Register a new finding",
    myFindings: "My findings",
    assignedRetests: "Assigned retests",
    noFindings: "You have not registered any findings yet.",
    noRetests: "No retests are assigned to you.",
  },

  form: {
    type: "Finding type",
    title: "Short title",
    reproductionSteps: "Steps to reproduce",
    expectedResult: "Expected result",
    actualResult: "Actual result",
    blocking: "Blocking issue",
    extraExplanation: "Additional explanation",
    route: "Page / route where the issue was observed",
    screenshot: "Screenshot",
    screenshotHint:
      "Optional. PNG, JPEG or WebP, maximum 5 MB.",
    submit: "Register finding",
    submitting: "Registering...",
    requiredHint: "Required fields are marked with *.",
  },

  types: {
    bug: "Bug",
    usability_ux: "Usability / UX",
    text_translation: "Text / translation",
    documentation: "Documentation",
    suggestion: "Suggestion",
  },

  status: {
    NEW: "New",
    NEEDS_INFO: "Needs information",
    HOLD: "On hold",
    APPROVED: "Approved",
    IN_PROGRESS: "In progress",
    READY_FOR_RETEST: "Ready for retest",
    VERIFIED: "Verified",
    CLOSED: "Closed",
  },

  detail: {
    title: "Finding details",
    close: "Close details",
    number: "Number",
    type: "Type",
    status: "Status",
    created: "Created",
    route: "Route",
    blocking: "Blocking",
    yes: "Yes",
    no: "No",
    steps: "Steps to reproduce",
    expected: "Expected result",
    actual: "Actual result",
    explanation: "Additional explanation",
    reason: "Status reason",
    environment: "Environment",
    language: "UI language",
    commit: "Application commit",
    browser: "Browser",
    operatingSystem: "Operating system",
    screen: "Screen",
    screenshot: "Screenshot",
    loadingScreenshot: "Loading screenshot...",
    screenshotUnavailable: "Screenshot could not be loaded.",
    noScreenshot: "No screenshot attached.",
    retryScreenshot: "Attach screenshot",
    uploadScreenshot: "Upload screenshot",
    history: "History",
    noHistory: "No history entries.",
    retestHistory: "Retest history",
    noRetestHistory: "No retest history.",
  },

  info: {
    title: "Additional information requested",
    description:
      "The administrator requested additional information for this finding.",
    placeholder: "Enter the requested information...",
    submit: "Send information",
    sending: "Sending...",
  },

  retest: {
    active: "Retest required",
    completed: "Completed",
    assignedBy: "Assigned by",
    assignedAt: "Assigned",
    comment: "Retest comment",
    commentPlaceholder:
      "Describe what you checked and the result...",
    pass: "PASS",
    fail: "FAIL",
    submitting: "Submitting...",
    result: "Result",
    completedAt: "Completed",
  },

  event: {
    created: "Finding created",
    info_added: "Additional information added",
    info_requested: "Additional information requested",
    status_changed: "Status changed",
    retest_assigned: "Retest assigned",
    retest_pass: "Retest passed",
    retest_fail: "Retest failed",
    implementation_updated: "Implementation reference updated",
  },

  messages: {
    loading: "Loading findings...",
    loadFailed: "Unable to load findings data.",
    operationFailed: "Operation failed",
    created: "Finding {id} was registered.",
    createdWithScreenshot:
      "Finding {id} was registered with a screenshot.",
    createdScreenshotFailed:
      "Finding {id} was registered, but the screenshot was not uploaded. The finding is saved; you can retry while it remains NEW.",
    screenshotUploaded: "Screenshot uploaded.",
    informationSent: "Additional information sent.",
    retestPass: "Retest submitted as PASS.",
    retestFail: "Retest submitted as FAIL.",
    requiredFields: "Complete all required fields.",
    invalidScreenshot:
      "Select a PNG, JPEG or WebP image no larger than 5 MB.",
  },

  testOnly:
    "Available only in the MVX TEST environment.",

  admin: {
    title: "Findings Register",
    subtitle:
      "Review and manage findings submitted during MVX TEST testing.",
    sectionTitle: "Test Findings Register",
    foundation:
      "The administrator workflow interface will be added in the next stage.",
  },
};

export default findings;
