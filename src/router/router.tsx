import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppLayout } from "../ui/layout/AppLayout";
import { BoardPage } from "../ui/pages/BoardPage";
import { MembersSettingsPage } from "../ui/pages/MembersSettingsPage";
import { GeneralSettingsPage } from "../ui/pages/GeneralSettingsPage";
import { DashboardPage } from "../ui/pages/DashboardPage";
import { RouteErrorPage } from "../ui/pages/RouteErrorPage";
import { AuthLandingPage } from "../ui/pages/AuthLandingPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <AuthLandingPage /> },
      { path: "auth/callback", element: <AuthLandingPage /> },
      { path: "w/:workspaceId/board", element: <BoardPage /> },
      { path: "w/:workspaceId/dashboard", element: <DashboardPage /> },
      { path: "w/:workspaceId/settings/members", element: <MembersSettingsPage /> },
      { path: "w/:workspaceId/settings/general", element: <GeneralSettingsPage /> }
    ]
  }
]);


