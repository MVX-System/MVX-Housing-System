const announcements = {
  common: {
    important: "Важно",
    information: "Информация",
    normal: "Обычное",
    loading: "Загрузка...",
    refresh: "Обновить",
    saving: "Сохранение...",
    working: "Обработка...",
  },

  resident: {
    title: "Объявления",
    subtitle: "Актуальная информация от {{facilityName}}.",
    noCurrent: "Актуальных объявлений нет.",
    showLess: "Свернуть",
    readPreview: "Читать далее",
    openAnnouncement: "Открыть объявление →",
  },

  details: {
    back: "← Назад к объявлениям",
    loading: "Загрузка объявления...",
    missingIdentifier: "Не указан идентификатор объявления.",
    notFound: "Объявление не найдено.",
    loadFailed: "Не удалось загрузить объявление.",
  },

  admin: {
    title: "Управление объявлениями",
    subtitle: "Создавайте и публикуйте объявления для жильцов.",
    editAnnouncement: "Редактировать объявление",
    newAnnouncement: "Новое объявление",
    formHint: "Сохраните как черновик или опубликуйте сразу.",
    cancelEditing: "Отменить редактирование",
    saveChanges: "Сохранить изменения",
    saveDraft: "Сохранить черновик",
    saveAndPublish: "Сохранить и опубликовать",
    listTitle: "Объявления",
    summary: "{{active}} активных или черновиков, всего {{total}}",
    loadingAnnouncements: "Загрузка объявлений...",
    noAnnouncements: "Объявления ещё не созданы.",
    updated: "Обновлено",
    from: "С",
    until: "До",
    edit: "Редактировать",
    publish: "Опубликовать",
    archive: "Архивировать",


    recipients: {
      title: "Получатели",
      hint: "Можно объединять подъезды, квартиры, роли и конкретных пользователей. Выбор «Все» заменяет остальных получателей.",
      everyone: "Все",
      section: "Подъезд",
      apartment: "Квартира",
      role: "Роль",
      user: "Пользователь",
      sections: "Подъезды",
      apartments: "Квартиры",
      roles: "Роли",
      users: "Пользователи",
      loading: "Загрузка получателей...",
      select: "Выберите получателя",
      add: "Добавить",
      setEveryone: "Отправить всем",
      remove: "Удалить получателя",
    },

    fields: {
      title: "Заголовок",
      text: "Текст",
      priority: "Приоритет",
      visibleFrom: "Показывать с",
      visibleUntil: "Показывать до",
    },

    placeholders: {
      title: "Заголовок объявления",
      text: "Информация для жильцов",
    },

    status: {
      published: "Опубликовано",
      archived: "В архиве",
      draft: "Черновик",
    },

    validation: {
      title: "Введите заголовок.",
      content: "Введите текст объявления.",
      recipients: "Выберите хотя бы одного получателя.",
      dateOrder: "Дата окончания не может быть раньше даты начала.",
      saveFailed: "Не удалось сохранить объявление. Проверьте сообщение выше.",
    },

    notice: {
      published: "Объявление опубликовано.",
      updated: "Объявление обновлено.",
      draftSaved: "Черновик сохранён.",
      archived: "Объявление перемещено в архив.",
    },

    confirm: {
      publish: "Опубликовать «{{title}}»?",
      archive: "Архивировать «{{title}}»? Жильцы больше не будут его видеть.",
    },
  },
};

export default announcements;
