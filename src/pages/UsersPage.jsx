import { getUserLocationOptions, getUserLocationLabels, userMatchesLocation } from "../utils/adminUsersLocationFilters";
import { formatMvxDateTime } from "../utils/displayDate";

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

import {
  useAuth,
} from "../context/AuthContext";

import {
  isFullAdmin,
} from "../access/adminCapabilities";

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
    search: "Search by sign-in name (Nick), name, email, phone or apartment",
    add: "+ Add User",
    loading: "Loading users...",
    all: "All",
    active: "Active",
    inactive: "Inactive",
    name: "Name",
    nick: "Sign-in name (Nick)",
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
    roleManagementTitle: "User roles",
    manageRoles: "Manage roles",
    rolesLoading: "Loading roles...",
    rolesHelp: "Select the complete set of roles for this user. Saving replaces the current role set.",
    rolesEmpty: "At least one role must be selected.",
    rolesSave: "Save roles",
    rolesSaving: "Saving...",
    rolesSelfAdminLocked: "Your own Administrator role cannot be removed here.",
    rolesLoadError: "User roles could not be loaded.",
    rolesSaveError: "User roles could not be saved.",
    rolesRefreshError: "Roles were saved, but the current session could not be refreshed. Reload the page.",
    roleLabels: {
      resident: "Resident",
      owner: "Owner",
      cooperative_member: "Cooperative member",
      board_member: "Board member",
      manager: "Manager",
      accountant: "Accountant",
      worker: "Worker",
      admin: "Administrator",
    },
    close: "Close",
    confirmInactive: "Set this user to inactive?",
    confirmActive: "Set this user to active?",
    recoveryTitle: "Account recovery",
    recoveryNone: "No recovery code",
    recoveryActive: "Active",
    recoveryExpired: "Expired",
    recoveryRevoked: "Revoked",
    recoveryUsed: "Used",
    recoveryExhausted: "Attempts exhausted",
    recoveryLoading: "Loading recovery status...",
    recoveryIssue: "Issue Recovery Code",
    recoveryReissue: "Issue New Recovery Code",
    recoveryRevoke: "Revoke Recovery Code",
    recoveryIssuedTitle: "Recovery Code",
    recoveryIssuedWarning: "This code is shown only once. Copy it now and send it to the verified user through the agreed manual channel.",
    recoveryCopy: "Copy code",
    recoveryCopied: "Copied",
    recoveryExpires: "Expires",
    recoveryAttempts: "Failed attempts",
    recoveryConfirmIssue: "Issue a new Recovery Code for this user? Any previous active code will be revoked.",
    recoveryConfirmRevoke: "Revoke the active Recovery Code for this user?",
    recoveryInactive: "Recovery Code can be issued only for an active user.",
  },
  lv: {
    title: "Lietotāji",
    search: "Meklēt pēc pieslēgšanās vārda, vārda, e-pasta, tālruņa vai dzīvokļa",
    add: "+ Pievienot lietotāju",
    loading: "Notiek lietotāju ielāde...",
    all: "Visi",
    active: "Aktīvs",
    inactive: "Neaktīvs",
    name: "Vārds",
    nick: "Pieslēgšanās vārds",
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
    roleManagementTitle: "Lietotāja lomas",
    manageRoles: "Pārvaldīt lomas",
    rolesLoading: "Notiek lomu ielāde...",
    rolesHelp: "Atlasiet pilnu šī lietotāja lomu kopu. Saglabāšana aizstāj pašreizējo lomu kopu.",
    rolesEmpty: "Jāizvēlas vismaz viena loma.",
    rolesSave: "Saglabāt lomas",
    rolesSaving: "Saglabā...",
    rolesSelfAdminLocked: "Savu Administratora lomu šeit noņemt nevar.",
    rolesLoadError: "Lietotāja lomas neizdevās ielādēt.",
    rolesSaveError: "Lietotāja lomas neizdevās saglabāt.",
    rolesRefreshError: "Lomas tika saglabātas, bet pašreizējo sesiju neizdevās atjaunināt. Pārlādējiet lapu.",
    roleLabels: {
      resident: "Iedzīvotājs",
      owner: "Dzīvokļa īpašnieks",
      cooperative_member: "Kooperatīva biedrs",
      board_member: "Valdes loceklis",
      manager: "Pārvaldnieks",
      accountant: "Grāmatvedis",
      worker: "Darbinieks",
      admin: "Administrators",
    },
    close: "Aizvērt",
    confirmInactive: "Iestatīt šo lietotāju kā neaktīvu?",
    confirmActive: "Iestatīt šo lietotāju kā aktīvu?",
    recoveryTitle: "Konta atjaunošana",
    recoveryNone: "Nav atjaunošanas koda",
    recoveryActive: "Aktīvs",
    recoveryExpired: "Beidzies",
    recoveryRevoked: "Atsaukts",
    recoveryUsed: "Izmantots",
    recoveryExhausted: "Mēģinājumi izsmelti",
    recoveryLoading: "Notiek atjaunošanas statusa ielāde...",
    recoveryIssue: "Izsniegt atjaunošanas kodu",
    recoveryReissue: "Izsniegt jaunu atjaunošanas kodu",
    recoveryRevoke: "Atsaukt atjaunošanas kodu",
    recoveryIssuedTitle: "Atjaunošanas kods",
    recoveryIssuedWarning: "Šis kods tiek parādīts tikai vienu reizi. Nokopējiet to tagad un nosūtiet pārbaudītajam lietotājam pa saskaņoto manuālo kanālu.",
    recoveryCopy: "Kopēt kodu",
    recoveryCopied: "Nokopēts",
    recoveryExpires: "Derīgs līdz",
    recoveryAttempts: "Neveiksmīgie mēģinājumi",
    recoveryConfirmIssue: "Izsniegt šim lietotājam jaunu atjaunošanas kodu? Iepriekšējais aktīvais kods tiks atsaukts.",
    recoveryConfirmRevoke: "Atsaukt šī lietotāja aktīvo atjaunošanas kodu?",
    recoveryInactive: "Atjaunošanas kodu var izsniegt tikai aktīvam lietotājam.",
  },
  ru: {
    title: "Пользователи",
    search: "Поиск по имени для входа, имени, email, телефону или квартире",
    add: "+ Добавить пользователя",
    loading: "Загрузка пользователей...",
    all: "Все",
    active: "Активный",
    inactive: "Неактивный",
    name: "Имя",
    nick: "Имя для входа",
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
    roleManagementTitle: "Роли пользователя",
    manageRoles: "Управление ролями",
    rolesLoading: "Загрузка ролей...",
    rolesHelp: "Выберите полный набор ролей пользователя. При сохранении текущий набор ролей будет заменён.",
    rolesEmpty: "Необходимо выбрать хотя бы одну роль.",
    rolesSave: "Сохранить роли",
    rolesSaving: "Сохранение...",
    rolesSelfAdminLocked: "Собственную роль Администратора здесь снять нельзя.",
    rolesLoadError: "Не удалось загрузить роли пользователя.",
    rolesSaveError: "Не удалось сохранить роли пользователя.",
    rolesRefreshError: "Роли сохранены, но не удалось обновить текущую сессию. Перезагрузите страницу.",
    roleLabels: {
      resident: "Житель",
      owner: "Собственник",
      cooperative_member: "Член кооператива",
      board_member: "Член правления",
      manager: "Управляющий",
      accountant: "Бухгалтер",
      worker: "Работник",
      admin: "Администратор",
    },
    close: "Закрыть",
    confirmInactive: "Перевести этого пользователя в неактивный статус?",
    confirmActive: "Сделать этого пользователя активным?",
    recoveryTitle: "Восстановление доступа",
    recoveryNone: "Код восстановления отсутствует",
    recoveryActive: "Активен",
    recoveryExpired: "Истёк",
    recoveryRevoked: "Отозван",
    recoveryUsed: "Использован",
    recoveryExhausted: "Попытки исчерпаны",
    recoveryLoading: "Загрузка статуса восстановления...",
    recoveryIssue: "Выдать код восстановления",
    recoveryReissue: "Выдать новый код восстановления",
    recoveryRevoke: "Отозвать код восстановления",
    recoveryIssuedTitle: "Код восстановления",
    recoveryIssuedWarning: "Этот код показывается только один раз. Скопируйте его сейчас и передайте проверенному пользователю по согласованному ручному каналу.",
    recoveryCopy: "Скопировать код",
    recoveryCopied: "Скопировано",
    recoveryExpires: "Действителен до",
    recoveryAttempts: "Неудачные попытки",
    recoveryConfirmIssue: "Выдать новый код восстановления этому пользователю? Предыдущий активный код будет отозван.",
    recoveryConfirmRevoke: "Отозвать активный код восстановления этого пользователя?",
    recoveryInactive: "Код восстановления можно выдать только активному пользователю.",
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
  const {
    me,
    refreshMe,
  } = useAuth();

  const canMutateUsers =
    isFullAdmin(
      me?.roles
    );

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
  // PR-9G.7C: presentation-only, non-PII location filters.
  const [locationSection, setLocationSection] = useState("all");
  const [locationFloor, setLocationFloor] = useState("all");
  const [locationApartments, setLocationApartments] = useState([]);


  const [
    selectedUser,
    setSelectedUser,
  ] = useState(null);

  const [
    recoveryStatus,
    setRecoveryStatus,
  ] = useState(null);

  const [
    recoveryLoading,
    setRecoveryLoading,
  ] = useState(false);

  const [
    recoveryBusy,
    setRecoveryBusy,
  ] = useState(false);

  const [
    issuedRecoveryCode,
    setIssuedRecoveryCode,
  ] = useState("");

  const [
    recoveryCodeCopied,
    setRecoveryCodeCopied,
  ] = useState(false);

  const {
    users,
    loading,
    error,
    loadUsers,
    searchUsers,
    getUserDetails,
    getRecoveryStatus,
    issueRecoveryCode,
    revokeRecoveryCode,

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
    addAssignment:
      addAssignmentRequest,
    removeAssignment:
      removeAssignmentRequest,
    getRoles,
    getUserRoles,
    setUserRoles,
  } = useUsers();

  const addAssignment =
    async () => {
      if (
        !canMutateUsers
      ) {
        return;
      }

      return addAssignmentRequest();
    };

  const removeAssignment =
    async (
      assignmentId
    ) => {
      if (
        !canMutateUsers
      ) {
        return;
      }

      return removeAssignmentRequest(
        assignmentId
      );
    };

  const [
    roleUser,
    setRoleUser,
  ] = useState(null);

  const [
    rolesCatalog,
    setRolesCatalog,
  ] = useState([]);

  const [
    selectedRoleIds,
    setSelectedRoleIds,
  ] = useState([]);

  const [
    initialRoleIds,
    setInitialRoleIds,
  ] = useState([]);

  const [
    rolesLoading,
    setRolesLoading,
  ] = useState(false);

  const [
    rolesSaving,
    setRolesSaving,
  ] = useState(false);

  const [
    rolesError,
    setRolesError,
  ] = useState("");


  const {
    apartments,
    loadApartments,
  } = useApartments();

  useEffect(() => {
    loadUsers();
    loadApartments();
  }, []);

  const loadRecoveryStatus =
    async (
      userId
    ) => {
      if (!userId) {
        setRecoveryStatus(
          null
        );
        return;
      }

      setRecoveryLoading(
        true
      );

      try {
        const result =
          await getRecoveryStatus(
            userId
          );

        setRecoveryStatus(
          result?.recovery ||
          {
            exists: false,
            status: "none",
          }
        );
      } catch (
        recoveryError
      ) {
        console.error(
          "LOAD RECOVERY STATUS ERROR:",
          recoveryError
        );

        setRecoveryStatus(
          null
        );

        window.alert(
          recoveryError?.message ||
            "Recovery status could not be loaded."
        );
      } finally {
        setRecoveryLoading(
          false
        );
      }
    };

  // Stage 2I-5A3E v4:
  // View/Edit decrypts PII for one user only.
  const openUserDetails =
    async (
      user,
      mode = "view"
    ) => {
      if (
        mode === "edit" &&
        !canMutateUsers
      ) {
        return;
      }

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

          setIssuedRecoveryCode(
            ""
          );

          setRecoveryCodeCopied(
            false
          );

          await loadRecoveryStatus(
            detailedUser.id
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

  const closeUserDetails =
    () => {
      setSelectedUser(
        null
      );
      setRecoveryStatus(
        null
      );
      setIssuedRecoveryCode(
        ""
      );
      setRecoveryCodeCopied(
        false
      );
    };

  const handleIssueRecoveryCode =
    async () => {
      if (
        !canMutateUsers
      ) {
        return;
      }

      if (!selectedUser?.id) {
        return;
      }

      if (
        Number(
          selectedUser.is_active
        ) !== 1
      ) {
        window.alert(
          text.recoveryInactive
        );
        return;
      }

      const confirmed =
        window.confirm(
          text.recoveryConfirmIssue
        );

      if (!confirmed) {
        return;
      }

      setRecoveryBusy(
        true
      );

      try {
        const result =
          await issueRecoveryCode(
            selectedUser.id
          );

        const recoveryCode =
          String(
            result?.recovery_code ||
            ""
          ).trim();

        if (!recoveryCode) {
          throw new Error(
            "Recovery code was not returned."
          );
        }

        setIssuedRecoveryCode(
          recoveryCode
        );

        setRecoveryCodeCopied(
          false
        );

        await loadRecoveryStatus(
          selectedUser.id
        );
      } catch (
        recoveryError
      ) {
        window.alert(
          recoveryError?.message ||
            "Recovery code could not be issued."
        );
      } finally {
        setRecoveryBusy(
          false
        );
      }
    };

  const handleRevokeRecoveryCode =
    async () => {
      if (
        !canMutateUsers
      ) {
        return;
      }

      if (!selectedUser?.id) {
        return;
      }

      const confirmed =
        window.confirm(
          text.recoveryConfirmRevoke
        );

      if (!confirmed) {
        return;
      }

      setRecoveryBusy(
        true
      );

      try {
        await revokeRecoveryCode(
          selectedUser.id
        );

        setIssuedRecoveryCode(
          ""
        );

        setRecoveryCodeCopied(
          false
        );

        await loadRecoveryStatus(
          selectedUser.id
        );
      } catch (
        recoveryError
      ) {
        window.alert(
          recoveryError?.message ||
            "Recovery code could not be revoked."
        );
      } finally {
        setRecoveryBusy(
          false
        );
      }
    };

  const copyIssuedRecoveryCode =
    async () => {
      if (
        !issuedRecoveryCode
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          issuedRecoveryCode
        );

        setRecoveryCodeCopied(
          true
        );
      } catch (
        copyError
      ) {
        console.error(
          "COPY RECOVERY CODE ERROR:",
          copyError
        );

        window.alert(
          "Recovery code could not be copied."
        );
      }
    };

  const recoveryStatusLabel =
    (status) => {
      const labels = {
        none:
          text.recoveryNone,
        active:
          text.recoveryActive,
        expired:
          text.recoveryExpired,
        revoked:
          text.recoveryRevoked,
        used:
          text.recoveryUsed,
        exhausted:
          text.recoveryExhausted,
      };

      return (
        labels[
          String(
            status || "none"
          )
        ] ||
        String(
          status || "none"
        )
      );
    };

  const formatRecoveryDate = (value) => formatMvxDateTime(value);

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

  const currentUserId =
    Number(
      me?.user?.id || 0
    );

  const normalizeRoleIds =
    (roleIds) =>
      [
        ...new Set(
          (
            Array.isArray(
              roleIds
            )
              ? roleIds
              : []
          )
            .map(
              (roleId) =>
                Number(roleId)
            )
            .filter(
              (roleId) =>
                Number.isInteger(
                  roleId
                ) &&
                roleId > 0
            )
        ),
      ].sort(
        (a, b) =>
          a - b
      );

  const roleSetKey =
    (roleIds) =>
      normalizeRoleIds(
        roleIds
      ).join(",");

  const openRoleManagement =
    async (
      user
    ) => {
      if (
        !canMutateUsers
      ) {
        return;
      }

      if (!user?.id) {
        return;
      }

      setRoleUser(
        user
      );

      setRolesCatalog(
        []
      );

      setSelectedRoleIds(
        []
      );

      setInitialRoleIds(
        []
      );

      setRolesError(
        ""
      );

      setRolesLoading(
        true
      );

      // Do not stack the role editor above the
      // detailed-user modal.
      closeUserDetails();

      try {
        const [
          catalog,
          currentRoleIds,
        ] =
          await Promise.all([
            getRoles(),
            getUserRoles(
              user.id
            ),
          ]);

        const normalizedCatalog =
          (
            Array.isArray(
              catalog
            )
              ? catalog
              : []
          )
            .map(
              (role) => ({
                ...role,
                id:
                  Number(
                    role.id
                  ),
              })
            )
            .filter(
              (role) =>
                Number.isInteger(
                  role.id
                ) &&
                role.id > 0 &&
                typeof role.name ===
                  "string"
            )
            .sort(
              (a, b) =>
                a.id - b.id
            );

        const normalizedIds =
          normalizeRoleIds(
            currentRoleIds
          );

        setRolesCatalog(
          normalizedCatalog
        );

        setSelectedRoleIds(
          normalizedIds
        );

        setInitialRoleIds(
          normalizedIds
        );
      } catch (
        rolesLoadError
      ) {
        console.error(
          "LOAD USER ROLES ERROR:",
          rolesLoadError
        );

        setRolesError(
          rolesLoadError?.message ||
            text.rolesLoadError
        );
      } finally {
        setRolesLoading(
          false
        );
      }
    };

  const closeRoleManagement =
    () => {
      if (
        rolesSaving
      ) {
        return;
      }

      setRoleUser(
        null
      );

      setRolesCatalog(
        []
      );

      setSelectedRoleIds(
        []
      );

      setInitialRoleIds(
        []
      );

      setRolesError(
        ""
      );
    };

  const toggleRole =
    (
      role
    ) => {
      const roleId =
        Number(
          role?.id
        );

      if (
        !Number.isInteger(
          roleId
        ) ||
        roleId <= 0
      ) {
        return;
      }

      const currentlySelected =
        selectedRoleIds.includes(
          roleId
        );

      const selfAdminLocked =
        Number(
          roleUser?.id
        ) ===
          currentUserId &&
        role?.name ===
          "admin" &&
        currentlySelected;

      if (
        selfAdminLocked
      ) {
        return;
      }

      setSelectedRoleIds(
        (current) =>
          currentlySelected
            ? current.filter(
                (currentRoleId) =>
                  currentRoleId !==
                  roleId
              )
            : normalizeRoleIds([
                ...current,
                roleId,
              ])
      );

      setRolesError(
        ""
      );
    };

  const handleSaveRoles =
    async () => {
      if (
        !canMutateUsers
      ) {
        return;
      }

      if (
        !roleUser?.id ||
        rolesSaving ||
        rolesLoading
      ) {
        return;
      }

      const normalizedIds =
        normalizeRoleIds(
          selectedRoleIds
        );

      if (
        normalizedIds.length === 0
      ) {
        setRolesError(
          text.rolesEmpty
        );

        return;
      }

      const adminRole =
        rolesCatalog.find(
          (role) =>
            role.name ===
            "admin"
        );

      const editingSelf =
        Number(
          roleUser.id
        ) ===
        currentUserId;

      if (
        editingSelf &&
        adminRole &&
        !normalizedIds.includes(
          Number(
            adminRole.id
          )
        )
      ) {
        setRolesError(
          text.rolesSelfAdminLocked
        );

        return;
      }

      setRolesSaving(
        true
      );

      setRolesError(
        ""
      );

      try {
        await setUserRoles(
          roleUser.id,
          normalizedIds
        );

        setInitialRoleIds(
          normalizedIds
        );

        if (
          editingSelf
        ) {
          try {
            await refreshMe();
          } catch (
            authRefreshError
          ) {
            console.error(
              "REFRESH AUTH AFTER SELF ROLE UPDATE ERROR:",
              authRefreshError
            );

            setRolesError(
              text.rolesRefreshError
            );

            return;
          }
        }

        setRoleUser(
          null
        );

        setRolesCatalog(
          []
        );

        setSelectedRoleIds(
          []
        );
      } catch (
        rolesSaveError
      ) {
        console.error(
          "SAVE USER ROLES ERROR:",
          rolesSaveError
        );

        setRolesError(
          rolesSaveError?.message ||
            text.rolesSaveError
        );
      } finally {
        setRolesSaving(
          false
        );
      }
    };

  const rolesChanged =
    roleSetKey(
      selectedRoleIds
    ) !==
    roleSetKey(
      initialRoleIds
    );

  
  // PR-9G.7C: same apartment metadata source as Admin -> Apartments.
  const locationOptions = useMemo(
    () => getUserLocationOptions(apartments, locationSection, locationFloor),
    [apartments, locationSection, locationFloor]
  );
  const locationLabels = getUserLocationLabels(
    (typeof language !== "undefined" && language) ||
    (typeof document !== "undefined" && document.documentElement.lang) || "en"
  );

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

          return userMatchesLocation(
            users.find((candidate) => Number(candidate.id) === Number(user.id)) || user,
            apartments, locationSection, locationFloor, locationApartments
          );
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
        apartments, locationSection, locationFloor, locationApartments,
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
      if (
        !canMutateUsers
      ) {
        return;
      }

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
      if (
        !canMutateUsers
      ) {
        return;
      }

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
      if (
        !canMutateUsers
      ) {
        return;
      }

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
          hidden={!canMutateUsers}
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
          {/* PR-9G.7C: Location filters; no changes to permissions or user data */}
          <div style={{ width: "100%", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", fontSize: 14 }}>
            <label style={{ display: "grid", gap: 4, minWidth: 150, flex: "1 1 150px" }}>
              <span>{locationLabels.section}</span>
              <select aria-label={locationLabels.section} style={{ ...inputStyle, fontSize: 14 }} value={locationSection}
                onChange={(event) => {
                  setLocationSection(event.target.value);
                  setLocationFloor("all");
                  setLocationApartments([]);
                }}>
                <option value="all">{locationLabels.allSections}</option>
                {locationOptions.sections.map((value) => (
                  <option value={value} key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 4, minWidth: 120, flex: "1 1 120px" }}>
              <span>{locationLabels.floor}</span>
              <select aria-label={locationLabels.floor} style={{ ...inputStyle, fontSize: 14 }} value={locationFloor}
                onChange={(event) => {
                  setLocationFloor(event.target.value);
                  setLocationApartments([]);
                }}>
                <option value="all">{locationLabels.allFloors}</option>
                {locationOptions.floors.map((value) => (
                  <option value={value} key={value}>{value}</option>
                ))}
              </select>
            </label>
            <details style={{ minWidth: 190, flex: "1 1 190px", position: "relative" }}>
              <summary style={{ cursor: "pointer", padding: "9px 10px", border: "1px solid #9ca3af", borderRadius: 8 }}>
                {locationLabels.apartments}: {locationApartments.length
                  ? `${locationApartments.length} ${locationLabels.selected}` : locationLabels.allApartments}
              </summary>
              <div style={{ maxHeight: 210, overflowY: "auto", padding: 8, border: "1px solid #9ca3af", borderRadius: 8 }}>
                {locationOptions.numbers.length === 0 && <span>{locationLabels.none}</span>}
                {locationOptions.numbers.map((number) => (
                  <label key={number} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 2px" }}>
                    <input type="checkbox" checked={locationApartments.includes(number)}
                      onChange={(event) => setLocationApartments((previous) =>
                        event.target.checked ? [...previous, number] : previous.filter((value) => value !== number)
                      )}/>
                    <span>{number}</span>
                  </label>
                ))}
              </div>
            </details>
            <button type="button" style={{ ...inputStyle, fontSize: 14, cursor: "pointer", alignSelf: "flex-end" }}
              onClick={() => {
                setLocationSection("all");
                setLocationFloor("all");
                setLocationApartments([]);
              }}>{locationLabels.reset}</button>
          </div>

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
                        hidden={!canMutateUsers}
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
                        hidden={!canMutateUsers}
                        onClick={() =>
                          openRoleManagement(
                            user
                          )
                        }
                        style={smallButtonStyle}
                      >
                        {text.manageRoles}
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
                        {canMutateUsers
                    ? text.assign
                    : text.assignmentTitle}
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
                  hidden={!canMutateUsers}
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
                  hidden={!canMutateUsers}
                  onClick={() =>
                    openRoleManagement(
                      user
                    )
                  }
                  style={smallButtonStyle}
                >
                  {text.manageRoles}
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
                  {canMutateUsers
                    ? text.assign
                    : text.assignmentTitle}
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
            hidden={!canMutateUsers}
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
              hidden={!canMutateUsers}
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
              hidden={!canMutateUsers}
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
              hidden={!canMutateUsers}
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
        onClose={
          closeUserDetails
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


            <button
              type="button"
              hidden={!canMutateUsers}
              onClick={() =>
                openRoleManagement(
                  selectedUser
                )
              }
              style={{
                ...secondarySmallButtonStyle,
                width: "100%",
              }}
            >
              {text.manageRoles}
            </button>

<div
              style={recoveryPanelStyle}
            >
              <div
                style={recoveryHeaderStyle}
              >
                <strong>
                  {text.recoveryTitle}
                </strong>

                {recoveryLoading ? (
                  <span
                    style={subtleStyle}
                  >
                    {text.recoveryLoading}
                  </span>
                ) : (
                  <span
                    style={recoveryStatusBadgeStyle(
                      recoveryStatus?.status ||
                        "none"
                    )}
                  >
                    {recoveryStatusLabel(
                      recoveryStatus?.status
                    )}
                  </span>
                )}
              </div>

              {!recoveryLoading &&
                recoveryStatus?.exists && (
                  <div
                    style={{
                      display: "grid",
                      gap: 5,
                    }}
                  >
                    <InfoRow
                      label={
                        text.recoveryExpires
                      }
                      value={
                        formatRecoveryDate(
                          recoveryStatus
                            ?.expires_at
                        )
                      }
                    />

                    <InfoRow
                      label={
                        text.recoveryAttempts
                      }
                      value={`${Number(
                        recoveryStatus
                          ?.failed_attempts ||
                          0
                      )} / ${Number(
                        recoveryStatus
                          ?.max_attempts ||
                          0
                      )}`}
                    />
                  </div>
                )}

              {issuedRecoveryCode && (
                <div
                  style={
                    recoveryCodeBoxStyle
                  }
                >
                  <strong>
                    {text.recoveryIssuedTitle}
                  </strong>

                  <code
                    style={
                      recoveryCodeStyle
                    }
                  >
                    {issuedRecoveryCode}
                  </code>

                  <div
                    style={
                      recoveryWarningStyle
                    }
                  >
                    {
                      text.recoveryIssuedWarning
                    }
                  </div>

                  <button
                    type="button"
                    onClick={
                      copyIssuedRecoveryCode
                    }
                    style={
                      smallButtonStyle
                    }
                  >
                    {recoveryCodeCopied
                      ? text.recoveryCopied
                      : text.recoveryCopy}
                  </button>
                </div>
              )}

              {Number(
                selectedUser.is_active
              ) !== 1 && (
                <div
                  style={
                    recoveryWarningStyle
                  }
                >
                  {text.recoveryInactive}
                </div>
              )}

              <div
                style={actionsStyle}
              >
                <button
                  type="button"
                  hidden={!canMutateUsers}
                  disabled={
                    recoveryBusy ||
                    recoveryLoading ||
                    Number(
                      selectedUser.is_active
                    ) !== 1
                  }
                  onClick={
                    handleIssueRecoveryCode
                  }
                  style={{
                    ...primaryButtonStyle,
                    opacity:
                      recoveryBusy ||
                      recoveryLoading ||
                      Number(
                        selectedUser.is_active
                      ) !== 1
                        ? 0.6
                        : 1,
                    cursor:
                      recoveryBusy ||
                      recoveryLoading ||
                      Number(
                        selectedUser.is_active
                      ) !== 1
                        ? "default"
                        : "pointer",
                  }}
                >
                  {recoveryStatus
                    ?.status ===
                    "active"
                      ? text.recoveryReissue
                      : text.recoveryIssue}
                </button>

                {recoveryStatus
                  ?.status ===
                  "active" && (
                    <button
                      type="button"
                      hidden={!canMutateUsers}
                      disabled={
                        recoveryBusy ||
                        recoveryLoading
                      }
                      onClick={
                        handleRevokeRecoveryCode
                      }
                      style={{
                        ...warningButtonStyle,
                        opacity:
                          recoveryBusy ||
                          recoveryLoading
                            ? 0.6
                            : 1,
                        cursor:
                          recoveryBusy ||
                          recoveryLoading
                            ? "default"
                            : "pointer",
                      }}
                    >
                      {text.recoveryRevoke}
                    </button>
                  )}
              </div>
            </div>

          </div>
        )}
      </Modal>

      <Modal
        open={
          Boolean(
            roleUser
          )
        }
        title={
          text.roleManagementTitle
        }
        onClose={
          closeRoleManagement
        }
      >
        {roleUser && (
          <div
            style={{
              display: "grid",
              gap: 14,
            }}
          >
            <div>
              <strong>
                {roleUser.nick ||
                  `#${roleUser.id}`}
              </strong>
            </div>

            <div
              style={
                subtleStyle
              }
            >
              {text.rolesHelp}
            </div>

            {rolesLoading ? (
              <div
                style={
                  noticeStyle
                }
              >
                {text.rolesLoading}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                }}
              >
                {rolesCatalog.map(
                  (role) => {
                    const roleId =
                      Number(
                        role.id
                      );

                    const checked =
                      selectedRoleIds.includes(
                        roleId
                      );

                    const selfAdminLocked =
                      Number(
                        roleUser.id
                      ) ===
                        currentUserId &&
                      role.name ===
                        "admin" &&
                      checked;

                    return (
                      <label
                        key={role.id}
                        style={{
                          display: "flex",
                          alignItems:
                            "flex-start",
                          gap: 10,
                          padding:
                            "10px 12px",
                          border:
                            "1px solid var(--border)",
                          borderRadius: 10,
                          cursor:
                            selfAdminLocked ||
                            rolesSaving
                              ? "default"
                              : "pointer",
                          opacity:
                            selfAdminLocked
                              ? 0.75
                              : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={
                            checked
                          }
                          disabled={
                            selfAdminLocked ||
                            rolesSaving
                          }
                          onChange={() =>
                            toggleRole(
                              role
                            )
                          }
                        />

                        <span
                          style={{
                            display:
                              "grid",
                            gap: 2,
                          }}
                        >
                          <strong>
                            {text.roleLabels?.[
                              role.name
                            ] ||
                              role.name}
                          </strong>

                          <span
                            style={{
                              ...subtleStyle,
                              fontFamily:
                                "monospace",
                              fontSize: 12,
                            }}
                          >
                            {role.name}
                          </span>

                          {selfAdminLocked && (
                            <span
                              style={{
                                ...subtleStyle,
                                fontSize:
                                  12,
                              }}
                            >
                              {
                                text.rolesSelfAdminLocked
                              }
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  }
                )}
              </div>
            )}

            {rolesError && (
              <div
                style={
                  errorStyle
                }
              >
                {rolesError}
              </div>
            )}

            <div
              style={{
                ...actionsStyle,
                justifyContent:
                  "flex-end",
              }}
            >
              <button
                type="button"
                onClick={
                  closeRoleManagement
                }
                disabled={
                  rolesSaving
                }
                style={
                  secondarySmallButtonStyle
                }
              >
                {text.cancel}
              </button>

              <button
                type="button"
                onClick={
                  handleSaveRoles
                }
                disabled={
                  rolesLoading ||
                  rolesSaving ||
                  !rolesChanged ||
                  selectedRoleIds.length ===
                    0
                }
                style={{
                  ...primaryButtonStyle,
                  opacity:
                    rolesLoading ||
                    rolesSaving ||
                    !rolesChanged ||
                    selectedRoleIds.length ===
                      0
                      ? 0.6
                      : 1,
                  cursor:
                    rolesLoading ||
                    rolesSaving ||
                    !rolesChanged ||
                    selectedRoleIds.length ===
                      0
                      ? "default"
                      : "pointer",
                }}
              >
                {rolesSaving
                  ? text.rolesSaving
                  : text.rolesSave}
              </button>
            </div>
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
              disabled={!canMutateUsers}
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
              disabled={!canMutateUsers}
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
              hidden={!canMutateUsers}
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
                      hidden={!canMutateUsers}
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

const recoveryPanelStyle = {
  display: "grid",
  gap: 10,
  marginTop: 8,
  padding: 12,
  border:
    "1px solid var(--border)",
  borderRadius: 10,
  background:
    "var(--surface-soft)",
};

const recoveryHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const recoveryCodeBoxStyle = {
  display: "grid",
  gap: 8,
  padding: 10,
  border:
    "1px solid #f59e0b",
  borderRadius: 9,
  background:
    "rgba(245,158,11,.08)",
};

const recoveryCodeStyle = {
  display: "block",
  padding: "9px 10px",
  borderRadius: 8,
  background:
    "var(--surface)",
  color:
    "var(--text-h)",
  fontSize: 16,
  fontWeight: 800,
  letterSpacing: ".06em",
  overflowWrap:
    "anywhere",
};

const recoveryWarningStyle = {
  color: "#92400e",
  fontSize: 11,
  lineHeight: 1.45,
};

function recoveryStatusBadgeStyle(
  status
) {
  const normalized =
    String(
      status || "none"
    );

  const styles = {
    active: {
      background:
        "#dcfce7",
      color:
        "#15803d",
    },
    expired: {
      background:
        "#fef3c7",
      color:
        "#92400e",
    },
    revoked: {
      background:
        "#fee2e2",
      color:
        "#b91c1c",
    },
    used: {
      background:
        "#dbeafe",
      color:
        "#1d4ed8",
    },
    exhausted: {
      background:
        "#fee2e2",
      color:
        "#b91c1c",
    },
    none: {
      background:
        "#f3f4f6",
      color:
        "#6b7280",
    },
  };

  const selected =
    styles[normalized] ||
    styles.none;

  return {
    display: "inline-flex",
    padding: "4px 7px",
    borderRadius: 999,
    background:
      selected.background,
    color:
      selected.color,
    fontSize: 10,
    fontWeight: 800,
    whiteSpace: "nowrap",
  };
}

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
