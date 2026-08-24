import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  useUsers,
} from "../hooks/useUsers";

import useApartments
  from "../hooks/useApartments";

import Modal
  from "../components/Modal";

import {
  useTranslation,
} from "../i18n";

const TEXT = {
  en: {
    title: "Users",
    search: "Search by nickname, name, email, phone or apartment",
    add: "+ Add User",
    loading: "Loading users...",
    all: "All",
    active: "Active",
    inactive: "Inactive",
    name: "Name",
    nick: "Nick",
    email: "Email",
    phone: "Phone",
    apartments: "Apartments",
    apartmentSingular: "Apartment",
    apartmentPlural: "Apartments",
    backToApartment: "Back to apartment",
    status: "Status",
    actions: "Actions",
    view: "View",
    edit: "Edit",
    assign: "Assignments",
    changeStatus: "Change status",
    noApartments: "No apartments",
    createTitle: "Create User",
    editTitle: "Edit User",
    firstName: "First name",
    lastName: "Last name",
    password: "Temporary password",
    create: "Create User",
    save: "Save changes",
    cancel: "Cancel",
    statusTitle: "Change user status",
    statusText: "This does not delete the user. All records and apartment history remain in the database.",
    setActive: "Set Active",
    setInactive: "Set Inactive",
    assignmentTitle: "Apartment assignments",
    selectApartment: "Select apartment",
    relation: "Relation",
    owner: "Owner",
    resident: "Resident",
    addAssignment: "Add assignment",
    existingAssignments: "Existing assignments",
    remove: "Remove",
    noAssignments: "No assignments",
    userInformation: "User information",
    close: "Close",
    confirmInactive: "Set this user to inactive?",
    confirmActive: "Set this user to active?",
  },
  lv: {
    title: "Lietotāji",
    search: "Meklēt pēc segvārda, vārda, e-pasta, tālruņa vai dzīvokļa",
    add: "+ Pievienot lietotāju",
    loading: "Notiek lietotāju ielāde...",
    all: "Visi",
    active: "Aktīvs",
    inactive: "Neaktīvs",
    name: "Vārds",
    nick: "Nick",
    email: "E-pasts",
    phone: "Tālrunis",
    apartments: "Dzīvokļi",
    apartmentSingular: "Dzīvoklis",
    apartmentPlural: "Dzīvokļi",
    backToApartment: "Atpakaļ uz dzīvokli",
    status: "Statuss",
    actions: "Darbības",
    view: "Skatīt",
    edit: "Rediģēt",
    assign: "Piesaistes",
    changeStatus: "Mainīt statusu",
    noApartments: "Nav dzīvokļu",
    createTitle: "Izveidot lietotāju",
    editTitle: "Rediģēt lietotāju",
    firstName: "Vārds",
    lastName: "Uzvārds",
    password: "Pagaidu parole",
    create: "Izveidot lietotāju",
    save: "Saglabāt izmaiņas",
    cancel: "Atcelt",
    statusTitle: "Mainīt lietotāja statusu",
    statusText: "Lietotājs netiek dzēsts. Visi ieraksti un dzīvokļu vēsture paliek datubāzē.",
    setActive: "Iestatīt aktīvu",
    setInactive: "Iestatīt neaktīvu",
    assignmentTitle: "Dzīvokļu piesaistes",
    selectApartment: "Izvēlieties dzīvokli",
    relation: "Saistība",
    owner: "Īpašnieks",
    resident: "Iedzīvotājs",
    addAssignment: "Pievienot piesaisti",
    existingAssignments: "Esošās piesaistes",
    remove: "Noņemt",
    noAssignments: "Piesaistu nav",
    userInformation: "Lietotāja informācija",
    close: "Aizvērt",
    confirmInactive: "Iestatīt šo lietotāju kā neaktīvu?",
    confirmActive: "Iestatīt šo lietotāju kā aktīvu?",
  },
  ru: {
    title: "Пользователи",
    search: "Поиск по Nick, имени, email, телефону или квартире",
    add: "+ Добавить пользователя",
    loading: "Загрузка пользователей...",
    all: "Все",
    active: "Активный",
    inactive: "Неактивный",
    name: "Имя",
    nick: "Nick",
    email: "Email",
    phone: "Телефон",
    apartments: "Квартиры",
    apartmentSingular: "Квартира",
    apartmentPlural: "Квартиры",
    backToApartment: "Вернуться к квартире",
    status: "Статус",
    actions: "Действия",
    view: "Просмотр",
    edit: "Редактировать",
    assign: "Связи с квартирами",
    changeStatus: "Изменить статус",
    noApartments: "Нет квартир",
    createTitle: "Создать пользователя",
    editTitle: "Редактировать пользователя",
    firstName: "Имя",
    lastName: "Фамилия",
    password: "Временный пароль",
    create: "Создать пользователя",
    save: "Сохранить изменения",
    cancel: "Отмена",
    statusTitle: "Изменить статус пользователя",
    statusText: "Пользователь не удаляется. Все записи и история связей с квартирами сохраняются в базе.",
    setActive: "Сделать активным",
    setInactive: "Сделать неактивным",
    assignmentTitle: "Связи с квартирами",
    selectApartment: "Выберите квартиру",
    relation: "Тип связи",
    owner: "Собственник",
    resident: "Жилец",
    addAssignment: "Добавить связь",
    existingAssignments: "Текущие связи",
    remove: "Удалить связь",
    noAssignments: "Связей нет",
    userInformation: "Информация о пользователе",
    close: "Закрыть",
    confirmInactive: "Перевести этого пользователя в неактивный статус?",
    confirmActive: "Сделать этого пользователя активным?",
  },
};

function ApartmentChips({
  value,
  onOpen,
  singularLabel,
  pluralLabel,
  disabled = false,
}) {
  const apartments = [
    ...new Set(
      String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];

  if (apartments.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 5,
      }}
    >
      <span
        style={{
          color: "var(--text)",
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        {apartments.length === 1
          ? singularLabel
          : pluralLabel}
      </span>

      {apartments.map((number) => (
        <button
          type="button"
          key={number}
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              onOpen(number);
            }
          }}
          style={{
            ...chipStyle,
            cursor: disabled
              ? "default"
              : "pointer",
            opacity: disabled
              ? 0.72
              : 1,
          }}
        >
          #{number}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}) {
  return (
    <label
      style={labelStyle}
    >
      {label}
      {required && " *"}

      <input
        type={type}
        value={value ?? ""}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        style={inputStyle}
      />
    </label>
  );
}

export default function UsersPage() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const [
    searchParams,
  ] = useSearchParams();

  const {
    language,
  } = useTranslation();

  const text =
    TEXT[language] ||
    TEXT.en;

  const crossNavigation =
    location.state
      ?.crossNavigation;

  const openedFromApartments =
    crossNavigation
      ?.origin ===
      "apartments";

  const requestedUserId =
    searchParams.get("user");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    piiSearchResults,
    setPiiSearchResults,
  ] = useState([]);

  const [
    piiSearchLoading,
    setPiiSearchLoading,
  ] = useState(false);

  const [
    userDetailLoading,
    setUserDetailLoading,
  ] = useState(false);

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    selectedUser,
    setSelectedUser,
  ] = useState(null);

  const {
    users,
    loading,
    error,
    loadUsers,
    searchUsers,
    getUserDetails,

    assignmentUser,
    setAssignmentUser,
    assignmentApartmentId,
    setAssignmentApartmentId,
    assignmentRelation,
    setAssignmentRelation,
    userAssignments,
    setUserAssignments,

    showCreateUser,
    setShowCreateUser,
    newUser,
    setNewUser,

    editingUser,
    setEditingUser,
    statusUser,
    setStatusUser,

    createUser,
    updateUser,
    setUserStatus,

    loadUserAssignments,
    addAssignment,
    removeAssignment,
  } = useUsers();

  const {
    apartments,
    loadApartments,
  } = useApartments();

  useEffect(() => {
    loadUsers();
  }, []);

  // Stage 2I-5A3E v4:
  // View/Edit decrypts PII for one user only.
  const openUserDetails =
    async (
      user,
      mode = "view"
    ) => {
      if (!user?.id) {
        return;
      }

      setUserDetailLoading(
        true
      );

      try {
        const detailedUser =
          await getUserDetails(
            user.id
          );

        if (mode === "edit") {
          setEditingUser({
            ...detailedUser,
          });
        } else {
          setSelectedUser(
            detailedUser
          );
        }
      } catch (
        detailError
      ) {
        console.error(
          "LOAD USER DETAIL ERROR:",
          detailError
        );

        window.alert(
          detailError?.message ||
            "User details could not be loaded."
        );
      } finally {
        setUserDetailLoading(
          false
        );
      }
    };

  // Stage 2I-5A3E v4:
  // PII search is performed only by the Worker.
  // Nick and apartment matching remain local.
  useEffect(() => {
    const query =
      search.trim();

    if (
      query.length < 2
    ) {
      setPiiSearchResults([]);
      setPiiSearchLoading(false);
      return undefined;
    }

    let cancelled = false;

    const timer =
      window.setTimeout(
        async () => {
          setPiiSearchLoading(
            true
          );

          try {
            const result =
              await searchUsers(
                query
              );

            if (!cancelled) {
              setPiiSearchResults(
                result
              );
            }
          } catch (
            searchError
          ) {
            console.error(
              "SEARCH USERS ERROR:",
              searchError
            );

            if (!cancelled) {
              setPiiSearchResults(
                []
              );
            }
          } finally {
            if (!cancelled) {
              setPiiSearchLoading(
                false
              );
            }
          }
        },
        250
      );

    return () => {
      cancelled = true;
      window.clearTimeout(
        timer
      );
    };
  }, [
    search,
    searchUsers,
  ]);

  useEffect(() => {
    if (
      !requestedUserId ||
      users.length === 0
    ) {
      return;
    }

    const requestedUser =
      users.find(
        (user) =>
          String(user.id) ===
          String(requestedUserId)
      );

    if (requestedUser) {
      openUserDetails(
        requestedUser,
        "view"
      );
    }
  }, [
    requestedUserId,
    users,
  ]);

  const filteredUsers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const matchesStatus =
        (user) => {
          const active =
            Number(
              user.is_active
            ) === 1;

          if (
            statusFilter ===
              "active" &&
            !active
          ) {
            return false;
          }

          if (
            statusFilter ===
              "inactive" &&
            active
          ) {
            return false;
          }

          return true;
        };

      if (!query) {
        return users.filter(
          matchesStatus
        );
      }

      if (query.length < 2) {
        return [];
      }

      const mergedById =
        new Map();

      for (
        const user of
          piiSearchResults
      ) {
        mergedById.set(
          Number(user.id),
          user
        );
      }

      for (const user of users) {
        const nonPiiSearchText =
          [
            user.nick,
            user.owner_apartments,
            user.resident_apartments,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        if (
          nonPiiSearchText.includes(
            query
          )
        ) {
          const id =
            Number(user.id);

          if (
            !mergedById.has(id)
          ) {
            mergedById.set(
              id,
              user
            );
          }
        }
      }

      return Array.from(
        mergedById.values()
      )
        .filter(
          matchesStatus
        )
        .sort(
          (a, b) =>
            Number(a.id) -
            Number(b.id)
        );
    }, [
      users,
      search,
      statusFilter,
      piiSearchResults,
    ]);

  // Stage 2I-5B4:
  // Status and apartment-assignment context use only Nick / user ID.
  // Point-loaded PII remains limited to explicit View/Edit and HMAC search.
  const openAssignments =
    async (user) => {
      await loadApartments();

      setAssignmentUser(
        user
      );

      await loadUserAssignments(
        user.id
      );
    };

  const openApartment =
    (number) => {
      if (
        openedFromApartments
      ) {
        return;
      }

      navigate(
        `/apartments?number=${number}`,
        {
          state: {
            crossNavigation: {
              origin: "users",
              returnTo: "/users",
            },
          },
        }
      );
    };

  const returnToApartment =
    () => {
      navigate(
        crossNavigation
          ?.returnTo ||
          "/apartments",
        {
          replace: true,
        }
      );
    };

  const handleCreate =
    async () => {
      try {
        await createUser();
      } catch (createError) {
        window.alert(
          createError.message
        );
      }
    };

  const handleUpdate =
    async () => {
      try {
        await updateUser(
          editingUser
        );
      } catch (updateError) {
        window.alert(
          updateError.message
        );
      }
    };

  const handleStatus =
    async () => {
      const nextStatus =
        Number(
          statusUser.is_active
        ) !== 1;

      const confirmed =
        window.confirm(
          nextStatus
            ? text.confirmActive
            : text.confirmInactive
        );

      if (!confirmed) {
        return;
      }

      try {
        await setUserStatus(
          statusUser.id,
          nextStatus
        );
      } catch (statusError) {
        window.alert(
          statusError.message
        );
      }
    };

  return (
    <div>
      <style>
        {`
          .users-table-wrap {
            overflow-x: auto;
            border: 1px solid var(--border);
            border-radius: 12px;
            background: var(--surface);
          }

          .users-table {
            width: 100%;
            min-width: 980px;
            border-collapse: collapse;
          }

          .users-table th,
          .users-table td {
            padding: 9px 10px;
            border-bottom: 1px solid var(--border);
            text-align: left;
            vertical-align: middle;
            font-size: 12px;
          }

          .users-table th {
            background: var(--surface-soft);
            color: var(--text-h);
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: .04em;
          }

          .users-mobile-list {
            display: none;
          }

          @media (max-width: 767px) {
            .users-table-wrap {
              display: none;
            }

            .users-mobile-list {
              display: grid;
              gap: 10px;
            }

            .users-header {
              padding-top: 54px;
            }

            .users-form-grid {
              grid-template-columns: minmax(0,1fr) !important;
            }
          }
        `}
      </style>

      {openedFromApartments && (
        <button
          type="button"
          onClick={
            returnToApartment
          }
          style={{
            ...smallButtonStyle,
            marginBottom: 10,
          }}
        >
          ← {text.backToApartment}
        </button>
      )}

      <header
        className="users-header"
        style={headerStyle}
      >
        <div>
          <h1
            style={{
              margin: 0,
              color:
                "var(--text-h)",
            }}
          >
            {text.title}
          </h1>

          <div
            style={subtleStyle}
          >
            {filteredUsers.length} / {users.length}
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowCreateUser(
              true
            )
          }
          style={primaryButtonStyle}
        >
          {text.add}
        </button>
      </header>

      <section
        style={toolbarStyle}
      >
        <input
          type="search"
          value={search}
          placeholder={text.search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          style={{
            ...inputStyle,
            flex: 1,
            minWidth: 220,
          }}
        />

        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {[
            ["all", text.all],
            ["active", text.active],
            ["inactive", text.inactive],
          ].map(
            ([
              value,
              label,
            ]) => (
              <button
                type="button"
                key={value}
                onClick={() =>
                  setStatusFilter(
                    value
                  )
                }
                style={
                  filterButtonStyle(
                    statusFilter ===
                      value
                  )
                }
              >
                {label}
              </button>
            )
          )}
        </div>
      </section>

      {(loading || piiSearchLoading || userDetailLoading) && (
        <div
          style={noticeStyle}
        >
          {text.loading}
        </div>
      )}

      {error && (
        <div
          style={errorStyle}
        >
          {error}
        </div>
      )}

      <div
        className="users-table-wrap"
      >
        <table
          className="users-table"
        >
          <thead>
            <tr>
              <th>ID</th>
              <th>{text.nick}</th>
              <th>{text.name}</th>
              <th>{text.email}</th>
              <th>{text.phone}</th>
              <th>{text.apartments}</th>
              <th>{text.status}</th>
              <th>{text.actions}</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map(
              (user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>

                  <td>{user.nick || "—"}</td>

                  <td>
                    {(
                      user.first_name ||
                      user.last_name
                    ) ? (
                      <button
                        type="button"
                        onClick={() =>
                          openUserDetails(
                            user,
                            "view"
                          )
                        }
                        style={linkButtonStyle}
                      >
                        {[
                          user.first_name,
                          user.last_name,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>
                    {user.email ? (
                      <a
                        href={`mailto:${user.email}`}
                      >
                        {user.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>
                    {user.phone ? (
                      <a
                        href={`tel:${user.phone}`}
                      >
                        {user.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>
                    <ApartmentChips
                      value={[
                        user.owner_apartments,
                        user.resident_apartments,
                      ]
                        .filter(Boolean)
                        .join(",")}
                      onOpen={
                        openApartment
                      }
                      singularLabel={
                        text.apartmentSingular
                      }
                      pluralLabel={
                        text.apartmentPlural
                      }
                      disabled={
                        openedFromApartments
                      }
                    />
                  </td>

                  <td>
                    <span
                      style={statusBadgeStyle(
                        Number(
                          user.is_active
                        ) === 1
                      )}
                    >
                      {Number(
                        user.is_active
                      ) === 1
                        ? text.active
                        : text.inactive}
                    </span>
                  </td>

                  <td>
                    <div
                      style={actionsStyle}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          openUserDetails(
                            user,
                            "view"
                          )
                        }
                        style={smallButtonStyle}
                      >
                        {text.view}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openUserDetails(
                            user,
                            "edit"
                          )
                        }
                        style={smallButtonStyle}
                      >
                        {text.edit}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openAssignments(
                            user
                          )
                        }
                        style={smallButtonStyle}
                      >
                        {text.assign}
                      </button>

                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      <div
        className="users-mobile-list"
      >
        {filteredUsers.map(
          (user) => (
            <article
              key={user.id}
              style={mobileCardStyle}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    openUserDetails(
                      user,
                      "view"
                    )
                  }
                  style={linkButtonStyle}
                >
                  {(
                    user.first_name ||
                    user.last_name
                  )
                    ? [
                        user.first_name,
                        user.last_name,
                      ]
                        .filter(Boolean)
                        .join(" ")
                    : (
                        user.nick ||
                        `#${user.id}`
                      )}
                </button>

                <span
                  style={statusBadgeStyle(
                    Number(
                      user.is_active
                    ) === 1
                  )}
                >
                  {Number(
                    user.is_active
                  ) === 1
                    ? text.active
                    : text.inactive}
                </span>
              </div>
              <div
                style={mobileMetaStyle}
              >
                <strong>{text.nick}:</strong>{" "}
                {user.nick || "—"}
              </div>

              <div
                style={mobileMetaStyle}
              >
                {user.email ? (
                  <a
                    href={`mailto:${user.email}`}
                  >
                    {user.email}
                  </a>
                ) : (
                  "—"
                )}
              </div>

              <div
                style={mobileMetaStyle}
              >
                {user.phone ? (
                  <a
                    href={`tel:${user.phone}`}
                  >
                    {user.phone}
                  </a>
                ) : (
                  "—"
                )}
              </div>

              <ApartmentChips
                value={[
                  user.owner_apartments,
                  user.resident_apartments,
                ]
                  .filter(Boolean)
                  .join(",")}
                onOpen={
                  openApartment
                }
                singularLabel={
                  text.apartmentSingular
                }
                pluralLabel={
                  text.apartmentPlural
                }
                disabled={
                  openedFromApartments
                }
              />

              <div
                style={{
                  ...actionsStyle,
                  marginTop: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    openUserDetails(
                      user,
                      "view"
                    )
                  }
                  style={smallButtonStyle}
                >
                  {text.view}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openUserDetails(
                      user,
                      "edit"
                    )
                  }
                  style={smallButtonStyle}
                >
                  {text.edit}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openAssignments(
                      user
                    )
                  }
                  style={smallButtonStyle}
                >
                  {text.assign}
                </button>

              </div>
            </article>
          )
        )}
      </div>

      <Modal
        open={
          showCreateUser
        }
        title={
          text.createTitle
        }
        onClose={() =>
          setShowCreateUser(
            false
          )
        }
      >
        <div
          className="users-form-grid"
          style={formGridStyle}
        >
          <Field
            label={text.nick}
            required
            value={
              newUser.nick
            }
            onChange={(value) =>
              setNewUser({
                ...newUser,
                nick: value,
              })
            }
          />

          <Field
            label={text.firstName}
            required
            value={
              newUser.first_name
            }
            onChange={(value) =>
              setNewUser({
                ...newUser,
                first_name: value,
              })
            }
          />

          <Field
            label={text.lastName}
            required
            value={
              newUser.last_name
            }
            onChange={(value) =>
              setNewUser({
                ...newUser,
                last_name: value,
              })
            }
          />

<Field
            label={text.phone}
            value={
              newUser.phone
            }
            onChange={(value) =>
              setNewUser({
                ...newUser,
                phone: value,
              })
            }
          />

          <Field
            label={text.email}
            required
            type="email"
            value={
              newUser.email
            }
            onChange={(value) =>
              setNewUser({
                ...newUser,
                email: value,
              })
            }
          />

          <Field
            label={text.password}
            required
            type="password"
            value={
              newUser.password
            }
            onChange={(value) =>
              setNewUser({
                ...newUser,
                password: value,
              })
            }
          />

          <button
            type="button"
            onClick={
              handleCreate
            }
            style={{
              ...primaryButtonStyle,
              gridColumn:
                "1 / -1",
            }}
          >
            {text.create}
          </button>
        </div>
      </Modal>

      <Modal
        open={
          Boolean(
            editingUser
          )
        }
        title={
          text.editTitle
        }
        onClose={() =>
          setEditingUser(
            null
          )
        }
      >
        {editingUser && (
          <div
            className="users-form-grid"
            style={formGridStyle}
          >
            <Field
              label={
                text.nick
              }
              required
              value={
                editingUser.nick
              }
              onChange={(value) =>
                setEditingUser({
                  ...editingUser,
                  nick: value,
                })
              }
            />

            <Field
              label={
                text.firstName
              }
              required
              value={
                editingUser.first_name
              }
              onChange={(value) =>
                setEditingUser({
                  ...editingUser,
                  first_name:
                    value,
                })
              }
            />

            <Field
              label={
                text.lastName
              }
              required
              value={
                editingUser.last_name
              }
              onChange={(value) =>
                setEditingUser({
                  ...editingUser,
                  last_name:
                    value,
                })
              }
            />

<Field
              label={text.phone}
              value={
                editingUser.phone
              }
              onChange={(value) =>
                setEditingUser({
                  ...editingUser,
                  phone: value,
                })
              }
            />

            <Field
              label={text.email}
              required
              type="email"
              value={
                editingUser.email
              }
              onChange={(value) =>
                setEditingUser({
                  ...editingUser,
                  email: value,
                })
              }
            />

            <button
              type="button"
              onClick={() => {
                setStatusUser(
                  editingUser
                );
                setEditingUser(
                  null
                );
              }}
              style={{
                ...secondarySmallButtonStyle,
                gridColumn:
                  "1 / -1",
              }}
            >
              {text.changeStatus}
            </button>

            <button
              type="button"
              onClick={
                handleUpdate
              }
              style={{
                ...primaryButtonStyle,
                gridColumn:
                  "1 / -1",
              }}
            >
              {text.save}
            </button>
          </div>
        )}
      </Modal>

      <Modal
        open={
          Boolean(
            statusUser
          )
        }
        title={
          text.statusTitle
        }
        onClose={() =>
          setStatusUser(
            null
          )
        }
      >
        {statusUser && (
          <div>
            <p>
              <strong>
                {statusUser.nick ||
                  `#${statusUser.id}`}
              </strong>
            </p>

            <p
              style={subtleStyle}
            >
              {text.statusText}
            </p>

            <button
              type="button"
              onClick={
                handleStatus
              }
              style={
                Number(
                  statusUser.is_active
                ) === 1
                  ? warningButtonStyle
                  : primaryButtonStyle
              }
            >
              {Number(
                statusUser.is_active
              ) === 1
                ? text.setInactive
                : text.setActive}
            </button>
          </div>
        )}
      </Modal>

      <Modal
        open={
          Boolean(
            selectedUser
          )
        }
        title={
          text.userInformation
        }
        onClose={() =>
          setSelectedUser(
            null
          )
        }
      >
        {selectedUser && (
          <div
            style={{
              display: "grid",
              gap: 8,
            }}
          >
            <InfoRow
              label={text.nick}
              value={selectedUser.nick}
            />

            <InfoRow
              label={text.name}
              value={`${selectedUser.first_name} ${selectedUser.last_name}`}
            />
            <InfoRow
              label={text.email}
              value={
                selectedUser.email ? (
                  <a
                    href={`mailto:${selectedUser.email}`}
                  >
                    {selectedUser.email}
                  </a>
                ) : (
                  "—"
                )
              }
            />

            <InfoRow
              label={text.phone}
              value={
                selectedUser.phone ? (
                  <a
                    href={`tel:${selectedUser.phone}`}
                  >
                    {selectedUser.phone}
                  </a>
                ) : (
                  "—"
                )
              }
            />

            <InfoRow
              label={text.status}
              value={
                Number(
                  selectedUser.is_active
                ) === 1
                  ? text.active
                  : text.inactive
              }
            />

          </div>
        )}
      </Modal>

      <Modal
        open={
          Boolean(
            assignmentUser
          )
        }
        title={
          text.assignmentTitle
        }
        onClose={() => {
          setAssignmentUser(
            null
          );
          setAssignmentApartmentId(
            ""
          );
          setUserAssignments(
            []
          );
        }}
      >
        {assignmentUser && (
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            <strong>
              {assignmentUser.nick ||
                `#${assignmentUser.id}`}
            </strong>

            <select
              value={
                assignmentApartmentId
              }
              onChange={(event) =>
                setAssignmentApartmentId(
                  event.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                {text.selectApartment}
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
                    #{apartment.number}
                  </option>
                )
              )}
            </select>

            <select
              value={
                assignmentRelation
              }
              onChange={(event) =>
                setAssignmentRelation(
                  event.target.value
                )
              }
              style={inputStyle}
            >
              <option value="owner">
                {text.owner}
              </option>

              <option value="resident">
                {text.resident}
              </option>
            </select>

            <button
              type="button"
              onClick={async () => {
                try {
                  await addAssignment();
                  setAssignmentApartmentId(
                    ""
                  );
                } catch (
                  assignmentError
                ) {
                  window.alert(
                    assignmentError.message
                  );
                }
              }}
              style={primaryButtonStyle}
            >
              {text.addAssignment}
            </button>

            <hr
              style={{
                width: "100%",
                borderColor:
                  "var(--border)",
              }}
            />

            <strong>
              {text.existingAssignments}
            </strong>

            {userAssignments.length ===
            0 ? (
              <span
                style={subtleStyle}
              >
                {text.noAssignments}
              </span>
            ) : (
              userAssignments.map(
                (assignment) => (
                  <div
                    key={
                      assignment.id
                    }
                    style={assignmentRowStyle}
                  >
                    <span>
                      #{assignment.number} ·{" "}
                      {assignment.relation_type ===
                      "owner"
                        ? text.owner
                        : text.resident}
                    </span>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await removeAssignment(
                            assignment.id
                          );
                        } catch (
                          removeError
                        ) {
                          window.alert(
                            removeError.message
                          );
                        }
                      }}
                      style={dangerTextButtonStyle}
                    >
                      {text.remove}
                    </button>
                  </div>
                )
              )
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function InfoRow({
  label,
  value,
}) {
  return (
    <div
      style={infoRowStyle}
    >
      <strong>
        {label}
      </strong>

      <span>
        {value === null ||
        value === undefined ||
        value === ""
          ? "—"
          : value}
      </span>
    </div>
  );
}

const headerStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 12,
};

const toolbarStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 12,
  padding: 12,
  border:
    "1px solid var(--border)",
  borderRadius: 12,
  background:
    "var(--surface)",
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2,minmax(0,1fr))",
  gap: 10,
};

const labelStyle = {
  display: "grid",
  gap: 5,
  color:
    "var(--text-h)",
  fontSize: 11,
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  minHeight: 38,
  boxSizing:
    "border-box",
  padding: "8px 10px",
  border:
    "1px solid var(--border)",
  borderRadius: 8,
  background:
    "var(--surface)",
  color:
    "var(--text-h)",
};

const primaryButtonStyle = {
  minHeight: 36,
  padding: "8px 12px",
  border: "none",
  borderRadius: 8,
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const warningButtonStyle = {
  ...primaryButtonStyle,
  background: "#b45309",
};

const smallButtonStyle = {
  padding: "6px 8px",
  border:
    "1px solid var(--border)",
  borderRadius: 7,
  background:
    "var(--surface-soft)",
  color:
    "var(--text-h)",
  fontSize: 10,
  fontWeight: 700,
  cursor: "pointer",
};

const secondarySmallButtonStyle = {
  ...smallButtonStyle,
  color: "#b45309",
};

const actionsStyle = {
  display: "flex",
  gap: 5,
  flexWrap: "wrap",
};

const chipStyle = {
  padding: "3px 7px",
  border:
    "1px solid var(--border)",
  borderRadius: 999,
  background:
    "var(--surface-soft)",
  color:
    "var(--text-h)",
  fontSize: 10,
  cursor: "pointer",
};

const linkButtonStyle = {
  padding: 0,
  border: "none",
  background: "none",
  color: "#2563eb",
  fontWeight: 700,
  cursor: "pointer",
  textAlign: "left",
};

const subtleStyle = {
  color:
    "var(--text)",
  fontSize: 11,
};

const noticeStyle = {
  marginBottom: 12,
  padding: 10,
  border:
    "1px solid var(--border)",
  borderRadius: 8,
  background:
    "var(--surface-soft)",
};

const errorStyle = {
  ...noticeStyle,
  color: "#b91c1c",
};

const mobileCardStyle = {
  padding: 13,
  border:
    "1px solid var(--border)",
  borderRadius: 12,
  background:
    "var(--surface)",
};

const mobileMetaStyle = {
  marginTop: 6,
  color:
    "var(--text)",
  fontSize: 11,
  overflowWrap:
    "anywhere",
};

const assignmentRowStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 10,
  padding: 8,
  border:
    "1px solid var(--border)",
  borderRadius: 8,
};

const dangerTextButtonStyle = {
  border: "none",
  background: "none",
  color: "#b91c1c",
  fontWeight: 700,
  cursor: "pointer",
};

const infoRowStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: 12,
  padding: "8px 0",
  borderBottom:
    "1px solid var(--border)",
};

function filterButtonStyle(
  active
) {
  return {
    padding: "7px 10px",
    border:
      active
        ? "1px solid #2563eb"
        : "1px solid var(--border)",
    borderRadius: 8,
    background:
      active
        ? "rgba(37,99,235,.10)"
        : "var(--surface)",
    color:
      active
        ? "#1d4ed8"
        : "var(--text-h)",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  };
}

function statusBadgeStyle(
  active
) {
  return {
    display: "inline-flex",
    padding: "4px 7px",
    borderRadius: 999,
    background:
      active
        ? "#dcfce7"
        : "#f3f4f6",
    color:
      active
        ? "#15803d"
        : "#6b7280",
    fontSize: 10,
    fontWeight: 800,
    whiteSpace: "nowrap",
  };
}
