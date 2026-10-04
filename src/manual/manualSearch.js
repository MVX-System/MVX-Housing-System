const STOP_WORDS = {
  lv: new Set([
    "ar",
    "es",
    "ir",
    "ka",
    "kas",
    "ko",
    "kur",
    "man",
    "no",
    "par",
    "to",
    "un",
    "uz",
    "vai",
  ]),
  en: new Set([
    "a",
    "an",
    "are",
    "can",
    "do",
    "for",
    "how",
    "i",
    "in",
    "is",
    "my",
    "of",
    "on",
    "the",
    "to",
    "with",
  ]),
  ru: new Set([
    "в",
    "где",
    "для",
    "и",
    "из",
    "как",
    "мне",
    "можно",
    "на",
    "нужно",
    "по",
    "с",
    "что",
    "я",
  ]),
};

const CONCEPTS = [
  {
    key: "account-recovery",
    targets: {
      resident: "manual-section-4-2",
      admin: "manual-section-7-6",
    },
    aliases: {
      lv: [
        "aizmirsu paroli",
        "aizmirsu nick",
        "nevaru pieslegties",
        "atjaunot piekluvi",
        "recovery code",
      ],
      en: [
        "forgot password",
        "forgot nick",
        "cannot log in",
        "cant log in",
        "cannot sign in",
        "recover access",
        "recovery code",
      ],
      ru: [
        "забыл пароль",
        "забыли пароль",
        "забыла пароль",
        "забыл ник",
        "забыли ник",
        "забыла ник",
        "не могу войти",
        "не получается войти",
        "восстановить доступ",
        "код восстановления",
        "recovery code",
      ],
    },
  },
  {
    key: "nick-change",
    targets: {
      resident: "manual-section-10",
      admin: "manual-section-15",
    },
    aliases: {
      lv: [
        "mainit nick",
        "nomainit nick",
        "izmainit nick",
        "jauns nick",
      ],
      en: [
        "change nick",
        "edit nick",
        "rename nick",
        "new nick",
      ],
      ru: [
        "поменять ник",
        "сменить ник",
        "изменить ник",
        "новый ник",
        "поменять nick",
        "сменить nick",
        "изменить nick",
      ],
    },
    hints: {
      lv:
        "Nick var mainīt personīgajos iestatījumos. Ievadiet jauno Nick un pašreizējo paroli. Pēc maiņas būs jāpieslēdzas vēlreiz.",
      en:
        "You can change your Nick in Personal Settings. Enter the new Nick and your current password. You will need to sign in again after the change.",
      ru:
        "Nick можно изменить в разделе «Личные настройки». Укажите новый Nick и текущий пароль. После изменения потребуется войти заново.",
    },
  },
  {
    key: "password-change",
    targets: {
      resident: "manual-section-10-1",
      admin: "manual-section-15-1",
    },
    aliases: {
      lv: [
        "mainit paroli",
        "nomainit paroli",
        "izmainit paroli",
      ],
      en: [
        "change password",
        "new password",
        "edit password",
      ],
      ru: [
        "сменить пароль",
        "поменять пароль",
        "изменить пароль",
        "новый пароль",
      ],
    },
  },
  {
    key: "water-readings",
    targets: {
      resident: "manual-section-7",
      admin: "manual-section-10",
    },
    aliases: {
      lv: [
        "udens radijumi",
        "iesniegt radijumu",
        "skaititaja radijums",
      ],
      en: [
        "water readings",
        "submit reading",
        "meter reading",
      ],
      ru: [
        "показания воды",
        "передать показания",
        "ввести показания",
        "показания счетчика",
        "показания счётчика",
      ],
    },
  },
  {
    key: "meter-replacement",
    targets: {
      resident: "manual-section-7",
      admin: "manual-section-9",
    },
    aliases: {
      lv: [
        "nomainits skaititajs",
        "skaititaja maina",
        "jauns skaititajs",
      ],
      en: [
        "meter replaced",
        "replace meter",
        "new water meter",
      ],
      ru: [
        "счетчик заменен",
        "счётчик заменён",
        "замена счетчика",
        "замена счётчика",
        "заменили счетчик",
        "заменили счётчик",
        "новый счетчик",
        "новый счётчик",
      ],
    },
  },
  {
    key: "pwa-install",
    targets: {
      resident: "manual-section-11",
      admin: "manual-section-16",
    },
    aliases: {
      lv: [
        "instalet lietotni",
        "pievienot sakuma ekranam",
        "pwa instalacija",
      ],
      en: [
        "install app",
        "add to home screen",
        "install pwa",
        "put app on screen",
      ],
      ru: [
        "установить приложение",
        "добавить приложение на экран",
        "добавить на главный экран",
        "установить pwa",
        "приложение на экран домой",
      ],
    },
  },
  {
    key: "announcements",
    targets: {
      resident: "manual-section-8",
      admin: "manual-section-12",
    },
    aliases: {
      lv: [
        "pazinojumi",
        "steidzams pazinojums",
      ],
      en: [
        "announcements",
        "urgent announcement",
        "notification",
      ],
      ru: [
        "объявления",
        "срочное объявление",
        "уведомления",
      ],
    },
  },
  {
    key: "documents",
    targets: {
      resident: "manual-section-9",
      admin: "manual-section-13",
    },
    aliases: {
      lv: [
        "dokumenti",
        "juridiska informacija",
      ],
      en: [
        "documents",
        "legal information",
      ],
      ru: [
        "документы",
        "юридическая информация",
      ],
    },
  },
  {
    key: "create-user",
    targets: {
      admin: "manual-section-7-2",
    },
    aliases: {
      lv: [
        "izveidot lietotaju",
        "jauns lietotajs",
      ],
      en: [
        "create user",
        "new user",
        "add user",
      ],
      ru: [
        "создать пользователя",
        "новый пользователь",
        "добавить пользователя",
      ],
    },
  },
];

export function normalizeManualSearchText(
  value
) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLocaleLowerCase()
    .replace(
      /['’`"]/g,
      " "
    )
    .replace(
      /[^\p{L}\p{N}._+-]+/gu,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function tokenize(
  value,
  language
) {
  const normalized =
    normalizeManualSearchText(
      value
    );

  if (!normalized) {
    return [];
  }

  const stopWords =
    STOP_WORDS[language] ||
    new Set();

  return [
    ...new Set(
      normalized
        .split(" ")
        .filter(
          (token) =>
            token.length >= 2 &&
            !stopWords.has(token)
        )
    ),
  ];
}

function displayTerms(
  value
) {
  return [
    ...new Set(
      String(value ?? "")
        .trim()
        .split(/\s+/)
        .map((token) =>
          token.replace(
            /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu,
            ""
          )
        )
        .filter(
          (token) =>
            token.length >= 2
        )
    ),
  ];
}

function getHeadingId(
  title
) {
  const match =
    String(title || "").match(
      /^(\d+)(?:\.(\d+))?\./
    );

  if (!match) {
    return null;
  }

  return [
    "manual-section",
    match[1],
    match[2],
  ]
    .filter(Boolean)
    .join("-");
}

function cleanMarkdownLine(
  line
) {
  return String(line || "")
    .replace(
      /^\s*>\s?/,
      ""
    )
    .replace(
      /^\s*[-*+]\s+/,
      ""
    )
    .replace(
      /^\s*\d+\.\s+/,
      ""
    )
    .replace(
      /\[([^\]]+)\]\([^)]+\)/g,
      "$1"
    )
    .replace(
      /[*_~`#|]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

export function getManualSearchSections(
  markdown
) {
  const lines =
    String(markdown ?? "")
      .split(/\r?\n/);

  const sections = [];
  let current = null;

  const finishCurrent = () => {
    if (!current) {
      return;
    }

    const text =
      current.lines
        .map(cleanMarkdownLine)
        .filter(Boolean)
        .join(" ")
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    sections.push({
      id: current.id,
      level: current.level,
      title: current.title,
      text,
      order: sections.length,
    });

    current = null;
  };

  for (const line of lines) {
    const heading =
      line.match(
        /^(##|###)\s+(.+?)\s*$/
      );

    if (heading) {
      finishCurrent();

      const title =
        heading[2].trim();

      const id =
        getHeadingId(title);

      if (id) {
        current = {
          id,
          level:
            heading[1].length,
          title,
          lines: [],
        };
      }

      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  finishCurrent();

  return sections;
}

function conceptMatches(
  concept,
  language,
  normalizedQuery,
  queryTokens
) {
  const aliases =
    concept.aliases?.[language] ||
    [];

  return aliases.some(
    (alias) => {
      const normalizedAlias =
        normalizeManualSearchText(
          alias
        );

      if (
        normalizedQuery ===
          normalizedAlias ||
        normalizedQuery.includes(
          normalizedAlias
        )
      ) {
        return true;
      }

      const aliasTokens =
        tokenize(
          alias,
          language
        );

      return (
        aliasTokens.length >= 2 &&
        aliasTokens.every(
          (token) =>
            queryTokens.includes(
              token
            )
        )
      );
    }
  );
}

function makeSnippet(
  section,
  rawTerms,
  hint
) {
  if (hint) {
    return hint;
  }

  const source =
    section.text ||
    section.title;

  if (source.length <= 220) {
    return source;
  }

  const lowered =
    source.toLocaleLowerCase();

  let firstIndex = -1;

  for (const term of rawTerms) {
    const index =
      lowered.indexOf(
        String(term)
          .toLocaleLowerCase()
      );

    if (
      index >= 0 &&
      (
        firstIndex < 0 ||
        index < firstIndex
      )
    ) {
      firstIndex = index;
    }
  }

  const start =
    firstIndex > 70
      ? firstIndex - 70
      : 0;

  const snippet =
    source.slice(
      start,
      start + 220
    );

  return [
    start > 0
      ? "…"
      : "",
    snippet,
    start + 220 <
      source.length
      ? "…"
      : "",
  ].join("");
}

export function searchManual({
  markdown,
  query,
  language = "en",
  mode = "resident",
  limit = 8,
}) {
  const normalizedQuery =
    normalizeManualSearchText(
      query
    );

  if (
    normalizedQuery.length < 2
  ) {
    return [];
  }

  const queryTokens =
    tokenize(
      query,
      language
    );

  const rawTerms =
    displayTerms(query);

  const sections =
    getManualSearchSections(
      markdown
    );

  const conceptHits =
    new Map();

  for (const concept of CONCEPTS) {
    const target =
      concept.targets?.[mode];

    if (
      !target ||
      !conceptMatches(
        concept,
        language,
        normalizedQuery,
        queryTokens
      )
    ) {
      continue;
    }

    conceptHits.set(
      target,
      {
        bonus: 500,
        hint:
          concept.hints?.[
            language
          ] ||
          null,
      }
    );
  }

  return sections
    .map((section) => {
      const normalizedTitle =
        normalizeManualSearchText(
          section.title
        );

      const normalizedBody =
        normalizeManualSearchText(
          section.text
        );

      const searchable =
        [
          normalizedTitle,
          normalizedBody,
        ]
          .filter(Boolean)
          .join(" ");

      let score = 0;

      if (
        normalizedTitle.includes(
          normalizedQuery
        )
      ) {
        score += 180;
      }

      if (
        normalizedBody.includes(
          normalizedQuery
        )
      ) {
        score += 120;
      }

      if (
        queryTokens.length > 0 &&
        queryTokens.every(
          (token) =>
            searchable.includes(
              token
            )
        )
      ) {
        score += 60;
      }

      for (
        const token
        of queryTokens
      ) {
        if (
          normalizedTitle.includes(
            token
          )
        ) {
          score += 28;
        } else if (
          normalizedBody.includes(
            token
          )
        ) {
          score += 8;
        }
      }

      const conceptHit =
        conceptHits.get(
          section.id
        );

      if (conceptHit) {
        score +=
          conceptHit.bonus;
      }

      return {
        id: section.id,
        level: section.level,
        title: section.title,
        snippet:
          makeSnippet(
            section,
            rawTerms,
            conceptHit?.hint
          ),
        terms: rawTerms,
        score,
        order: section.order,
      };
    })
    .filter(
      (result) =>
        result.score > 0
    )
    .sort(
      (left, right) =>
        right.score -
          left.score ||
        right.level -
          left.level ||
        left.order -
          right.order
    )
    .slice(
      0,
      Math.max(
        1,
        Number(limit) || 8
      )
    );
}
