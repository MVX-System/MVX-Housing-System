const login = {
  title: "MVX System",
  nick: "Nick",
  facilityFallback: "Объект",
  email: "Электронная почта",
  password: "Пароль",
  login: "Войти",
  recoverAccess: "Восстановить доступ",
  forgotCredentials: "Забыли Ник или пароль?",
  haveRecoveryCode: "У меня есть Recovery Code",

  landing: {
    description: "Система управления жилым домом и самообслуживания жильцов.",
    addressAndContacts: "Адрес и контакты",
    address: "Адрес",
    contacts: "Контакты",
    email: "Электронная почта",
    phone: "Телефон",
  },

  form: {
    title: "Вход",
  },

  help: {
    title: "Забыли Ник или пароль?",
    message: "Если Вы забыли Ник или пароль, обратитесь к Администратору MVX.",
    email: "Электронная почта",
    phone: "Телефон",
    close: "Закрыть",
  },

  install: {
    title: "Установить MVX на это устройство?",
    message: "Добавьте MVX на это устройство для быстрого доступа.",
    install: "Установить",
    notNow: "Не сейчас",
    guideTitle: "Добавить MVX на устройство",
    guides: {
      ios: "В Safari нажмите «Поделиться», выберите «На экран Домой», затем «Добавить». После этого iPhone вернётся на экран «Домой». Закройте ранее открытую вкладку MVX в Safari и далее запускайте MVX через новую иконку MVX.",
      macSafari: "В Safari выберите File → Add to Dock и подтвердите добавление.",
      android: "Откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран».",
      desktop: "Откройте меню браузера и выберите «Установить MVX» или «Установить приложение».",
    },
    back: "Назад",
    done: "Готово — добавлено",
  },
  recovery: {
    title: "Восстановление доступа",
    description: "Введите свой Nick, Recovery Code, выданный администратором, и новый пароль.",
    nick: "Nick",
    code: "Recovery Code",
    newPassword: "Новый пароль",
    confirmPassword: "Повторите новый пароль",
    changePassword: "Изменить пароль",
    changingPassword: "Изменение пароля...",
    backToLogin: "Вернуться к входу",
    completeAllFields: "Заполните все поля.",
    passwordTooShort: "Новый пароль должен содержать не менее 8 символов.",
    passwordsDoNotMatch: "Пароли не совпадают.",
    genericError: "Не удалось завершить восстановление доступа. Проверьте введённые данные и попробуйте ещё раз.",
    successTitle: "Пароль изменён",
    successText: "Пароль успешно изменён. Все ранее активные сеансы закрыты.",
    goToLogin: "Перейти к входу",
  },

  placeholders: {
    email: "Электронная почта",
    password: "Пароль",
  },
};

export default login;
