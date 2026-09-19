import {
  useEffect,
  useState,
} from "react";

import {
  Outlet,
} from "react-router-dom";

import Sidebar
  from "./components/Sidebar";

import LanguageSelector
  from "./components/LanguageSelector";

import ContextHelpButton
  from "./components/ContextHelpButton";

import {
  layout,
  content,
} from "./styles/theme";

const MOBILE_BREAKPOINT = 768;
const FIXED_SIDEBAR_BREAKPOINT = 1150;

export default function App() {
  const [
    viewportWidth,
    setViewportWidth,
  ] = useState(
    window.innerWidth
  );

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    desktopSidebarCollapsed,
    setDesktopSidebarCollapsed,
  ] = useState(false);

  const isMobile =
    viewportWidth <
    MOBILE_BREAKPOINT;

  const isCompactDesktop =
    viewportWidth >=
      MOBILE_BREAKPOINT &&
    viewportWidth <
      FIXED_SIDEBAR_BREAKPOINT;

  const drawerMode =
    isMobile ||
    isCompactDesktop;

  useEffect(() => {
    const onResize = () =>
      setViewportWidth(
        window.innerWidth
      );

    window.addEventListener(
      "resize",
      onResize
    );

    return () =>
      window.removeEventListener(
        "resize",
        onResize
      );
  }, []);

  useEffect(() => {
    setSidebarOpen(false);

    if (drawerMode) {
      setDesktopSidebarCollapsed(
        false
      );
    }
  }, [drawerMode]);

  const showMenuButton =
    drawerMode ||
    desktopSidebarCollapsed;

  const openMenu = () => {
    if (drawerMode) {
      setSidebarOpen(
        (current) =>
          !current
      );
    } else {
      setDesktopSidebarCollapsed(
        false
      );
    }
  };

  return (
    <div style={layout}>
      {showMenuButton && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: 20,
            zIndex: 1400,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={openMenu}
            aria-label="Open menu"
            style={{
              width: 44,
              height: 44,
              border: "none",
              borderRadius: 10,
              fontSize: 22,
              cursor: "pointer",
              background: "#2563eb",
              color: "white",
              boxShadow:
                "0 8px 20px rgba(15,23,42,.18)",
            }}
          >
            ☰
          </button>

          {isMobile && (
            <LanguageSelector
              variant="compact"
            />
          )}
        </div>
      )}

      {drawerMode &&
        sidebarOpen && (
          <div
            onClick={() =>
              setSidebarOpen(
                false
              )
            }
            style={{
              position: "fixed",
              inset: 0,
              background:
                "rgba(0,0,0,0.35)",
              zIndex: 1500,
            }}
          />
        )}

      <Sidebar
        isMobile={isMobile}
        isCompactDesktop={
          isCompactDesktop
        }
        sidebarOpen={
          sidebarOpen
        }
        setSidebarOpen={
          setSidebarOpen
        }
        desktopCollapsed={
          desktopSidebarCollapsed
        }
        setDesktopCollapsed={
          setDesktopSidebarCollapsed
        }
      />

      <main
        style={{
          ...content,
          width: "100%",
          minWidth: 0,
          overflowX: "auto",
          paddingTop:
            showMenuButton
              ? 80
              : 30,
        }}
      >
        <Outlet />
      </main>

      <ContextHelpButton />
    </div>
  );
}
