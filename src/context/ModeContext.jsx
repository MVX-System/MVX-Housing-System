import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  useAuth,
} from "./AuthContext";

const ModeContext =
  createContext(null);

const MODE_KEY =
  "app_mode";

const MODE_USER_KEY =
  "app_mode_user_id";

function hasResidentAccess(
  roles
) {
  return (
    roles.includes(
      "resident"
    ) ||
    roles.includes(
      "owner"
    )
  );
}

function hasAdminAccess(
  roles
) {
  return roles.includes(
    "admin"
  );
}

function isModeAllowed(
  mode,
  roles
) {
  if (
    mode === "resident"
  ) {
    return hasResidentAccess(
      roles
    );
  }

  if (
    mode === "admin"
  ) {
    return hasAdminAccess(
      roles
    );
  }

  return false;
}

function getDefaultMode(
  roles
) {
  if (
    hasResidentAccess(
      roles
    )
  ) {
    return "resident";
  }

  if (
    hasAdminAccess(
      roles
    )
  ) {
    return "admin";
  }

  return "resident";
}

export function ModeProvider({
  children,
}) {
  const {
    me,
  } = useAuth();

  const [
    sessionMode,
    setSessionMode,
  ] = useState(() => ({
    mode:
      sessionStorage.getItem(
        MODE_KEY
      ) || "resident",
    userId:
      sessionStorage.getItem(
        MODE_USER_KEY
      ),
  }));

  const roles =
    Array.isArray(
      me?.roles
    )
      ? me.roles
      : [];

  const currentUserId =
    me?.user?.id === null ||
    me?.user?.id === undefined
      ? null
      : String(
          me.user.id
        );

  const storedModeIsUsable =
    currentUserId !== null &&
    sessionMode.userId ===
      currentUserId &&
    isModeAllowed(
      sessionMode.mode,
      roles
    );

  const mode =
    currentUserId === null
      ? "resident"
      : storedModeIsUsable
        ? sessionMode.mode
        : getDefaultMode(
            roles
          );

  useEffect(() => {
    // Remove the legacy cross-user
    // persistent mode value.
    localStorage.removeItem(
      MODE_KEY
    );
  }, []);

  useEffect(() => {
    if (
      currentUserId === null
    ) {
      return;
    }

    sessionStorage.setItem(
      MODE_KEY,
      mode
    );

    sessionStorage.setItem(
      MODE_USER_KEY,
      currentUserId
    );

    if (
      sessionMode.mode !==
        mode ||
      sessionMode.userId !==
        currentUserId
    ) {
      setSessionMode({
        mode,
        userId:
          currentUserId,
      });
    }
  }, [
    currentUserId,
    mode,
    sessionMode.mode,
    sessionMode.userId,
  ]);

  const setMode =
    useCallback(
      (
        nextMode
      ) => {
        if (
          currentUserId ===
          null
        ) {
          return;
        }

        const resolvedMode =
          typeof nextMode ===
          "function"
            ? nextMode(
                mode
              )
            : nextMode;

        if (
          !isModeAllowed(
            resolvedMode,
            roles
          )
        ) {
          return;
        }

        sessionStorage.setItem(
          MODE_KEY,
          resolvedMode
        );

        sessionStorage.setItem(
          MODE_USER_KEY,
          currentUserId
        );

        setSessionMode({
          mode:
            resolvedMode,
          userId:
            currentUserId,
        });
      },
      [
        currentUserId,
        mode,
        roles,
      ]
    );

  return (
    <ModeContext.Provider
      value={{
        mode,
        setMode,
      }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context =
    useContext(
      ModeContext
    );

  if (!context) {
    throw new Error(
      "useMode must be used inside ModeProvider"
    );
  }

  return context;
}
