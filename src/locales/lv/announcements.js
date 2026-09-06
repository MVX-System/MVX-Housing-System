const announcements = {
  common: {
    important: "Svarīgi",
    information: "Informācija",
    normal: "Parasts",
    loading: "Ielādē...",
    refresh: "Atjaunot",
    saving: "Saglabā...",
    working: "Apstrādā...",
  },

  resident: {
    title: "Paziņojumi",
    subtitle: "Aktuālā informācija no {{facilityName}}.",
    noCurrent: "Pašlaik nav aktuālu paziņojumu.",
    showLess: "Rādīt mazāk",
    readPreview: "Lasīt priekšskatījumu",
    openAnnouncement: "Atvērt paziņojumu →",
  },

  details: {
    back: "← Atpakaļ uz paziņojumiem",
    loading: "Ielādē paziņojumu...",
    missingIdentifier: "Nav norādīts paziņojuma identifikators.",
    notFound: "Paziņojums nav atrasts.",
    loadFailed: "Paziņojumu neizdevās ielādēt.",
  },

  admin: {
    title: "Paziņojumu pārvaldība",
    subtitle: "Izveidojiet un publicējiet paziņojumus iedzīvotājiem.",
    editAnnouncement: "Rediģēt paziņojumu",
    newAnnouncement: "Jauns paziņojums",
    formHint: "Saglabājiet kā melnrakstu vai publicējiet uzreiz.",
    cancelEditing: "Atcelt rediģēšanu",
    saveChanges: "Saglabāt izmaiņas",
    saveDraft: "Saglabāt melnrakstu",
    saveAndPublish: "Saglabāt un publicēt",
    listTitle: "Paziņojumi",
    summary: "{{active}} aktīvi vai melnraksti, kopā {{total}}",
    loadingAnnouncements: "Ielādē paziņojumus...",
    noAnnouncements: "Nav izveidots neviens paziņojums.",
    updated: "Atjaunināts",
    from: "No",
    until: "Līdz",
    edit: "Rediģēt",
    publish: "Publicēt",
    archive: "Arhivēt",


    recipients: {
      title: "Saņēmēji",
      hint: "Apvienojiet kāpņu telpas, dzīvokļus, lomas un konkrētus lietotājus. Izvēle “Visiem” aizstāj pārējos saņēmējus.",
      everyone: "Visiem",
      section: "Kāpņu telpa",
      apartment: "Dzīvoklis",
      role: "Loma",
      user: "Lietotājs",
      sections: "Kāpņu telpas",
      apartments: "Dzīvokļi",
      roles: "Lomas",
      users: "Lietotāji",
      loading: "Saņēmēji tiek ielādēti...",
      select: "Izvēlieties saņēmēju",
      add: "Pievienot",
      setEveryone: "Nosūtīt visiem",
      remove: "Noņemt saņēmēju",
    },

    fields: {
      title: "Virsraksts",
      text: "Teksts",
      priority: "Prioritāte",
      visibleFrom: "Redzams no",
      visibleUntil: "Redzams līdz",
    },

    placeholders: {
      title: "Paziņojuma virsraksts",
      text: "Informācija iedzīvotājiem",
    },

    status: {
      published: "Publicēts",
      archived: "Arhivēts",
      draft: "Melnraksts",
    },

    validation: {
      title: "Ievadiet virsrakstu.",
      content: "Ievadiet paziņojuma tekstu.",
      recipients: "Izvēlieties vismaz vienu saņēmēju.",
      dateOrder: "Beigu datums nevar būt agrāks par sākuma datumu.",
      saveFailed: "Paziņojumu neizdevās saglabāt. Pārbaudiet iepriekš redzamo ziņojumu.",
    },

    notice: {
      published: "Paziņojums publicēts.",
      updated: "Paziņojums atjaunināts.",
      draftSaved: "Melnraksts saglabāts.",
      archived: "Paziņojums arhivēts.",
    },

    confirm: {
      publish: "Publicēt \"{{title}}\"?",
      archive: "Arhivēt \"{{title}}\"? Iedzīvotāji to vairs neredzēs.",
    },
  },
};

export default announcements;
