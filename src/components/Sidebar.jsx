import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import MenuButton
  from "./MenuButton";

import LanguageSelector
  from "./LanguageSelector";

import {
  useAuth,
} from "../context/AuthContext";

import {
  useMode,
} from "../context/ModeContext";

import {
  useTranslation,
} from "../i18n";

import {
  sidebar,
  buttonStyle,
  menuButton,
  activeButton,
  divider,
  sidebarTitle,
  sidebarUser,
  modeBlock,
} from "../styles/theme";

const LAST_PATH_KEYS = {
  resident:
    "mvx:last-path:resident",

  admin:
    "mvx:last-path:admin",
};

const DEFAULT_PATHS = {
  resident: "/",
  admin: "/",
};

const RESIDENT_PATHS = new Set([
  "/",
  "/water",
  "/announcements",
  "/settings",
]);

const ADMIN_PATHS = new Set([
  "/",
  "/users",
  "/apartments",
  "/water-meters",
  "/water-readings",
  "/monthly-report",
  "/admin-announcements",
  "/settings",
]);

const SETTINGS_LABELS = {
  lv: "Iestatījumi",
  en: "Settings",
  ru: "Настройки",
};

function isPathAllowedForMode(
  path,
  mode
) {
  if (mode === "resident") {
    return RESIDENT_PATHS.has(
      path
    );
  }

  if (mode === "admin") {
    return ADMIN_PATHS.has(
      path
    );
  }

  return false;
}

function saveLastPath(
  mode,
  path
) {
  const key =
    LAST_PATH_KEYS[mode];

  if (
    !key ||
    !isPathAllowedForMode(
      path,
      mode
    )
  ) {
    return;
  }

  sessionStorage.setItem(
    key,
    path
  );
}

function getLastPath(
  mode
) {
  const key =
    LAST_PATH_KEYS[mode];

  const storedPath =
    key
      ? sessionStorage.getItem(
          key
        )
      : null;

  if (
    storedPath &&
    isPathAllowedForMode(
      storedPath,
      mode
    )
  ) {
    return storedPath;
  }

  return (
    DEFAULT_PATHS[mode] ||
    "/"
  );
}

export default function Sidebar({
  isMobile = false,
  isCompactDesktop = false,
  sidebarOpen = false,
  setSidebarOpen = () => {},
  desktopCollapsed = false,
  setDesktopCollapsed = () => {},
}) {
  const {
    me,
    logout,
  } = useAuth();

  const {
    mode,
    setMode,
  } = useMode();

  const {
    t,
    language,
  } = useTranslation();

  const navigate =
    useNavigate();

  const location =
    useLocation();

  if (!me) {
    return null;
  }

  const roles =
    me?.roles || [];

  const mustChangePassword =
    Number(
      me?.user
        ?.must_change_password
    ) === 1;

  const hasResident =
    roles.includes("resident") ||
    roles.includes("owner");

  const hasAdmin =
    roles.includes("admin");

  const settingsLabel =
    SETTINGS_LABELS[language] ||
    SETTINGS_LABELS.en;

  const drawerMode =
    isMobile ||
    isCompactDesktop;

  const closeMobileSidebar =
    () => {
      if (drawerMode) {
        setSidebarOpen(false);
      }
    };

  const go = (
    path
  ) => {
    saveLastPath(
      mode,
      path
    );

    navigate(path);

    closeMobileSidebar();
  };

  const switchMode = (
    nextMode
  ) => {
    if (
      nextMode === mode
    ) {
      closeMobileSidebar();
      return;
    }

    saveLastPath(
      mode,
      location.pathname
    );

    const targetPath =
      getLastPath(
        nextMode
      );

    setMode(
      nextMode
    );

    navigate(
      targetPath
    );

    closeMobileSidebar();
  };

  const isActivePath =
    (path) =>
      location.pathname === path;

  const sidebarStyle = {
    ...sidebar,

    ...(drawerMode
      ? {
          position: "fixed",
          top: 0,
          left: sidebarOpen
            ? 0
            : -280,
          height: "100dvh",
          overflow: "hidden",
          zIndex: 1800,
          transition:
            "left 0.25s ease",
          boxShadow:
            sidebarOpen
              ? "12px 0 30px rgba(15,23,42,.24)"
              : "none",
        }
      : {
          display:
            desktopCollapsed
              ? "none"
              : "flex",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
        }),
  };

  const topBlockStyle = {
    flex: "0 0 auto",
  };

  const menuScrollStyle =
    isMobile
      ? {}
      : {
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          paddingRight: 4,
          scrollbarGutter:
            "stable",
          overscrollBehavior:
            "contain",
        };

  const bottomBlockStyle =
    isMobile
      ? {
          marginTop:
            "auto",
        }
      : {
          flex: "0 0 auto",
          marginTop: 0,
          paddingTop: 2,
        };

  return (
    <div
      style={sidebarStyle}
    >
      <div
        style={topBlockStyle}
      >
        {!drawerMode && (
          <div
            style={{
              display: "flex",
              justifyContent:
                "flex-end",
              marginBottom: 2,
            }}
          >
            <button
              type="button"
              onClick={() =>
                setDesktopCollapsed(
                  true
                )
              }
              aria-label="Collapse menu"
              title="Collapse menu"
              style={{
                width: 30,
                height: 30,
                border:
                  "1px solid #374151",
                borderRadius: 8,
                background:
                  "transparent",
                color: "#d1d5db",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              ◀
            </button>
          </div>
        )}

        <h2
          style={sidebarTitle}
        >
          <div
            style={{
              fontSize: "0.8em",
            }}
          >
            MVX System
          </div>

          <div>
            DzĪKS IRLAVA 20
          </div>
        </h2>

        <div
          style={sidebarUser}
        >
          {t("sidebar.user")}:{" "}
          {me?.user?.nick ||
            t(
              "dashboard.relations.resident"
            )}
        </div>

        {!mustChangePassword && (
          <div
            style={modeBlock}
          >
            {hasResident && (
              <button
                style={
                  mode === "resident"
                    ? activeButton
                    : menuButton
                }
                onClick={() =>
                  switchMode(
                    "resident"
                  )
                }
              >
                {t(
                  "sidebar.residentMode"
                )}
              </button>
            )}

            {hasAdmin && (
              <button
                style={
                  mode === "admin"
                    ? activeButton
                    : menuButton
                }
                onClick={() =>
                  switchMode(
                    "admin"
                  )
                }
              >
                {t(
                  "sidebar.adminMode"
                )}
              </button>
            )}
          </div>
        )}

        <hr style={divider} />
      </div>

      <div
        style={menuScrollStyle}
      >
        {!mustChangePassword &&
          mode === "resident" && (
          <>
            <MenuButton
              title={t(
                "sidebar.dashboard"
              )}
              active={isActivePath("/")}
              onClick={() =>
                go("/")
              }
            />

            <MenuButton
              title={t(
                "sidebar.waterMeters"
              )}
              active={isActivePath("/water")}
              onClick={() =>
                go("/water")
              }
            />

            <MenuButton
              title={t(
                "sidebar.announcements"
              )}
              active={isActivePath("/announcements")}
              onClick={() =>
                go(
                  "/announcements"
                )
              }
            />
          </>
        )}

        {!mustChangePassword &&
          mode === "admin" && (
          <>
            <MenuButton
              title={t(
                "sidebar.dashboard"
              )}
              active={
                isActivePath("/")
              }
              onClick={() =>
                go("/")
              }
            />

            <MenuButton
              title={t(
                "sidebar.users"
              )}
              active={isActivePath("/users")}
              onClick={() =>
                go("/users")
              }
            />

            <MenuButton
              title={t(
                "sidebar.apartments"
              )}
              active={isActivePath("/apartments")}
              onClick={() =>
                go("/apartments")
              }
            />

            <MenuButton
              title={t(
                "sidebar.waterMeterManagement"
              )}
              active={isActivePath("/water-meters")}
              onClick={() =>
                go("/water-meters")
              }
            />

            <MenuButton
              title={t(
                "sidebar.waterReadingHistory"
              )}
              active={isActivePath("/water-readings")}
              onClick={() =>
                go("/water-readings")
              }
            />

            <MenuButton
              title={t(
                "sidebar.announcements"
              )}
              active={isActivePath("/admin-announcements")}
              onClick={() =>
                go(
                  "/admin-announcements"
                )
              }
            />

            <MenuButton
              title={t(
                "sidebar.monthlyReport"
              )}
              active={isActivePath("/monthly-report")}
              onClick={() =>
                go("/monthly-report")
              }
            />
          </>
        )}

        <hr style={divider} />

        {mustChangePassword && (
          <div
            style={{
              margin:
                "0 8px 12px",
              padding: 10,
              borderRadius: 9,
              background:
                "rgba(180,83,83,.10)",
              color:
                "var(--text-h)",
              fontSize: 11,
              lineHeight: 1.45,
            }}
          >
            {language === "lv"
              ? "Lai turpinātu, nomainiet pagaidu paroli."
              : language === "ru"
                ? "Для продолжения смените временный пароль."
                : "Change the temporary password to continue."}
          </div>
        )}

        <MenuButton
          title={
            settingsLabel
          }
          active={
            isActivePath(
              "/settings"
            )
          }
          onClick={() =>
            go("/settings")
          }
        />
      </div>

      <div
        style={bottomBlockStyle}
      >
        <hr style={divider} />

        {!isMobile && (
          <LanguageSelector
            variant="sidebar"
            style={{
              marginBottom: 10,
            }}
          />
        )}

        <button
          onClick={logout}
          style={buttonStyle}
        >
          {t(
            "sidebar.logout"
          )}
        </button>
      </div>
    </div>
  );
}