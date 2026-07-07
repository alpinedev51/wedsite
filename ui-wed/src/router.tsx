import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import OurStory from "./pages/OurStory";
import WeddingParty from "./pages/WeddingParty";
import ThingsToDo from "./pages/ThingsToDo";
import Travel from "./pages/Travel";
import Photos from "./pages/Photos";
import Registry from "./pages/Registry";
import NotFound from "./pages/NotFound";
import RsvpPage from "./features/rsvp/RsvpPage";
import FindInvitationPage from "./features/invitation/FindInvitationPage";
import { AuthProvider } from "./features/auth/AuthContext";
import RequireAdmin from "./features/auth/RequireAdmin";
import LoginPage from "./features/auth/LoginPage";
import AdminPage from "./features/admin/AdminPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: "our-story", element: <OurStory /> },
      { path: "wedding-party", element: <WeddingParty /> },
      { path: "things-to-do", element: <ThingsToDo /> },
      { path: "travel", element: <Travel /> },
      { path: "photos", element: <Photos /> },
      { path: "registry", element: <Registry /> },
      // Magic links are per-household (invite_token lives on Household, not
      // Guest), embedded as a path param -- /rsvp with no token has nothing
      // to load, so it sends the guest to look their invitation up instead.
      { path: "rsvp", element: <Navigate to="/find-invitation" replace /> },
      { path: "rsvp/:token", element: <RsvpPage /> },
      { path: "find-invitation", element: <FindInvitationPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  // Admin subtree: deliberately outside the public `/` Layout (no couple
  // nav/footer chrome here). AuthProvider is scoped to just this subtree so
  // its mount-time session probe (see AuthContext) only fires when an admin
  // route is actually visited, not on every public-page load. `/admin/login`
  // sits outside RequireAdmin (it must be reachable while logged out);
  // everything else is nested under it so new admin pages just need adding
  // to that children array to inherit the login redirect.
  {
    path: "admin",
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    children: [
      { path: "login", element: <LoginPage /> },
      {
        element: <RequireAdmin />,
        children: [
          { index: true, element: <Navigate to="admin_dashboard" replace /> },
          { path: "admin_dashboard", element: <AdminPage /> },
        ],
      },
    ],
  },
]);
