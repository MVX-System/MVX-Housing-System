const findings = {
  resident: {
    title: "Testēšanas konstatējumi",
    subtitle:
      "Reģistrējiet MVX TEST testēšanas laikā atrastās problēmas un sekojiet to statusam.",
    newFinding: "Reģistrēt jaunu konstatējumu",
    myFindings: "Mani konstatējumi",
    assignedRetests: "Man piešķirtās atkārtotās pārbaudes",
    noFindings: "Jūs vēl neesat reģistrējis nevienu konstatējumu.",
    noRetests: "Jums nav piešķirtu atkārtotu pārbaužu.",
  },

  form: {
    type: "Konstatējuma veids",
    title: "Īss virsraksts",
    reproductionSteps: "Atkārtošanas soļi",
    expectedResult: "Sagaidāmais rezultāts",
    actualResult: "Faktiskais rezultāts",
    blocking: "Bloķējoša problēma",
    extraExplanation: "Papildu skaidrojums",
    route: "Lapa / maršruts, kur problēma tika konstatēta",
    screenshot: "Ekrānuzņēmums",
    screenshotHint:
      "Neobligāti. PNG, JPEG vai WebP, ne vairāk kā 5 MB.",
    submit: "Reģistrēt konstatējumu",
    submitting: "Reģistrē...",
    requiredHint: "Obligātie lauki ir atzīmēti ar *.",
  },

  types: {
    bug: "Kļūda",
    usability_ux: "Lietojamība / UX",
    text_translation: "Teksts / tulkojums",
    documentation: "Dokumentācija",
    suggestion: "Ieteikums",
  },

  status: {
    NEW: "Jauns",
    NEEDS_INFO: "Nepieciešama informācija",
    HOLD: "Aizturēts",
    APPROVED: "Apstiprināts",
    IN_PROGRESS: "Izstrādē",
    READY_FOR_RETEST: "Gatavs atkārtotai pārbaudei",
    VERIFIED: "Pārbaudīts",
    CLOSED: "Slēgts",
  },

  detail: {
    title: "Konstatējuma informācija",
    close: "Aizvērt",
    number: "Numurs",
    type: "Veids",
    status: "Statuss",
    created: "Izveidots",
    route: "Maršruts",
    blocking: "Bloķējošs",
    yes: "Jā",
    no: "Nē",
    steps: "Atkārtošanas soļi",
    expected: "Sagaidāmais rezultāts",
    actual: "Faktiskais rezultāts",
    explanation: "Papildu skaidrojums",
    reason: "Statusa iemesls",
    environment: "Vide",
    language: "Saskarnes valoda",
    commit: "Lietotnes commit",
    browser: "Pārlūks",
    operatingSystem: "Operētājsistēma",
    screen: "Ekrāns",
    screenshot: "Ekrānuzņēmums",
    loadingScreenshot: "Ielādē ekrānuzņēmumu...",
    screenshotUnavailable: "Ekrānuzņēmumu neizdevās ielādēt.",
    noScreenshot: "Ekrānuzņēmums nav pievienots.",
    retryScreenshot: "Pievienot ekrānuzņēmumu",
    uploadScreenshot: "Augšupielādēt ekrānuzņēmumu",
    history: "Vēsture",
    noHistory: "Vēstures ierakstu nav.",
    retestHistory: "Atkārtoto pārbaužu vēsture",
    noRetestHistory: "Atkārtoto pārbaužu nav.",
  },

  info: {
    title: "Pieprasīta papildu informācija",
    description:
      "Administrators šim konstatējumam ir pieprasījis papildu informāciju.",
    placeholder: "Ievadiet pieprasīto informāciju...",
    submit: "Nosūtīt informāciju",
    sending: "Nosūta...",
  },

  retest: {
    active: "Nepieciešama atkārtota pārbaude",
    completed: "Pabeigta",
    assignedBy: "Piešķīra",
    assignedAt: "Piešķirts",
    comment: "Atkārtotās pārbaudes komentārs",
    commentPlaceholder:
      "Aprakstiet, ko pārbaudījāt un kāds bija rezultāts...",
    pass: "PASS",
    fail: "FAIL",
    submitting: "Nosūta...",
    result: "Rezultāts",
    completedAt: "Pabeigts",
  },

  event: {
    created: "Konstatējums izveidots",
    info_added: "Papildu informācija pievienota",
    info_requested: "Pieprasīta papildu informācija",
    status_changed: "Statuss mainīts",
    retest_assigned: "Piešķirta atkārtota pārbaude",
    retest_pass: "Atkārtotā pārbaude izturēta",
    retest_fail: "Atkārtotā pārbaude nav izturēta",
    implementation_updated: "Atjaunināta ieviešanas atsauce",
  },

  messages: {
    loading: "Ielādē konstatējumus...",
    loadFailed: "Neizdevās ielādēt konstatējumu datus.",
    operationFailed: "Darbība neizdevās",
    created: "Konstatējums {id} ir reģistrēts.",
    createdWithScreenshot:
      "Konstatējums {id} ir reģistrēts ar ekrānuzņēmumu.",
    createdScreenshotFailed:
      "Konstatējums {id} ir reģistrēts, bet ekrānuzņēmums netika augšupielādēts. Konstatējums ir saglabāts; augšupielādi var atkārtot, kamēr statuss ir NEW.",
    screenshotUploaded: "Ekrānuzņēmums augšupielādēts.",
    informationSent: "Papildu informācija nosūtīta.",
    retestPass: "Atkārtotā pārbaude iesniegta kā PASS.",
    retestFail: "Atkārtotā pārbaude iesniegta kā FAIL.",
    requiredFields: "Aizpildiet visus obligātos laukus.",
    invalidScreenshot:
      "Izvēlieties PNG, JPEG vai WebP attēlu, kas nav lielāks par 5 MB.",
  },

  testOnly:
    "Pieejams tikai MVX TEST vidē.",

  admin: {
    title: "Konstatējumu reģistrs",
    subtitle:
      "Pārskatiet un pārvaldiet MVX TEST testēšanas laikā iesniegtos konstatējumus.",
    sectionTitle: "Testēšanas konstatējumu reģistrs",
    foundation:
      "Administratora darbplūsmas saskarne tiks pievienota nākamajā posmā.",
  },
};

export default findings;
