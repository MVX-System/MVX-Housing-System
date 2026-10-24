const water = {
  resident: {
    title: "Показания счётчиков воды",
    subtitle: "Передайте текущие значения, указанные на ваших счётчиках воды.",
    noMeters: "Счётчики воды не найдены.",
    apartment: "Квартира",
    notAssigned: "Не назначена",
    meterCount: {
      one: "{{count}} счётчик",
      few: "{{count}} счётчика",
      other: "{{count}} счётчиков",
    },

    period: {
      statusTitle: "Статус приёма показаний воды",
      openTitle: "Приём показаний воды открыт",
      closedTitle: "Приём показаний воды закрыт",
      loading: "Загрузка периода приёма показаний воды...",
      loadFailed: "Не удалось загрузить период приёма показаний воды.",
      unavailable: "Период приёма показаний воды недоступен.",
      openUntil: "Показания можно передать до {{date}}.",
      opensOn: "Следующий период приёма показаний откроется {{date}}.",
      closedOn: "Последний период приёма показаний завершился {{date}}.",
    },
  },

  card: {
    water: "Вода",
    coldWater: "Холодная вода",
    hotWater: "Горячая вода",
    customWater: "{{type}} вода",
    riser: "Стояк",
    serialNumber: "Серийный номер",
    currentReading: "Текущее показание",
    lastSubmitted: "Последняя передача",
    newReading: "Новое показание, м³",
    submit: "Передать",
    submitting: "Передача...",
    inputHint: "Введите полное показание счётчика. Цифры до запятой — кубические метры; три цифры после запятой — литры.",
    viewHistory: "Посмотреть историю",
  },

  history: {
    title: "История счётчика",
    typeHistory: "История: {{type}}",
    waterMeter: "Счётчик воды",
    loading: "Загрузка истории...",
    apartment: "Квартира",
    noPreviousReadings: "Предыдущих показаний нет.",
    date: "Дата",
    reading: "Показание",
    consumption: "Расход",
    correct: "Исправить",
    correctLatestReading: "Исправить последнее показание",
    correctedReading: "Исправленное показание, м³",
    correctionReason: "Причина исправления",
    otherReason: "Другая причина",
    describeReason: "Опишите причину",
    enterCorrectionReason: "Укажите причину исправления",
    cancel: "Отмена",
    saving: "Сохранение...",
    saveCorrection: "Сохранить исправление",
    close: "Закрыть",

    reasons: {
      incorrectDigit: "Неправильно введена цифра",
      wrongMeter: "Выбран неправильный счётчик",
      decimalPoint: "Ошибка десятичного разделителя",
      other: "Другое",
    },
  },
};

export default water;
