import {
  createBrowserRouter,
} from "react-router-dom";

import App from "../App";

import LoginPage
  from "../pages/LoginPage";

import AccountRecoveryPage
  from "../pages/AccountRecoveryPage";

import DashboardPage
  from "../pages/DashboardPage";

import UsersPage
  from "../pages/UsersPage";

import ApartmentsPage
  from "../pages/ApartmentsPage";

import ResidentWaterPage
  from "../pages/ResidentWaterPage";

import WaterReadingsPage
  from "../pages/WaterReadingsPage";

import WaterMetersPage
  from "../pages/WaterMetersPage";

import AdminMonthlyReportPage
  from "../pages/AdminMonthlyReportPage";

import AnnouncementsPage
  from "../pages/AnnouncementsPage";

import AdminAnnouncementsPage
  from "../pages/AdminAnnouncementsPage";

import AnnouncementDetailsPage
  from "../pages/AnnouncementDetailsPage";

import SettingsPage
  from "../pages/SettingsPage";

import ProtectedRoute
  from "../routes/ProtectedRoute";

export const router =
  createBrowserRouter([

    {
      path: "/login",
      element: <LoginPage />,
    },

    {
      path: "/account-recovery",
      element:
        <AccountRecoveryPage />,
    },

    {
      path: "/",

      element: (
        <ProtectedRoute>
          <App />
        </ProtectedRoute>
      ),

      children: [

        {
          index: true,
          element:
            <DashboardPage />,
        },

        {
          path: "users",
          element:
            <UsersPage />,
        },

        {
          path: "apartments",
          element:
            <ApartmentsPage />,
        },

        {
          path: "water",
          element:
            <ResidentWaterPage />,
        },

        {
          path: "announcements",
          element:
            <AnnouncementsPage />,
        },

        {
          path: "announcement",
          element:
            <AnnouncementDetailsPage />,
        },

        {
          path: "admin-announcements",
          element:
            <AdminAnnouncementsPage />,
        },

        {
          path: "water-readings",
          element:
            <WaterReadingsPage />,
        },

        {
          path: "water-meters",
          element:
            <WaterMetersPage />,
        },

        {
          path: "monthly-report",
          element:
            <AdminMonthlyReportPage />,
        },

        {
          path: "settings",
          element:
            <SettingsPage />,
        },

      ],
    },

  ]);
