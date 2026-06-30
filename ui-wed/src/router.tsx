import { createBrowserRouter } from "react-router-dom";
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
      { path: "rsvp", element: <RsvpPage /> },
      { path: "find-invitation", element: <FindInvitationPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
