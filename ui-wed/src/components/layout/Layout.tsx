import { Outlet, ScrollRestoration } from "react-router-dom";
import NameBanner from "./NameBanner";
import Nav from "./Nav";
import Footer from "./Footer";

function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* React Router keeps the old scroll position across client navigations,
          so tapping "Things To Do" from the footer used to land you halfway
          down the activity grid. */}
      <ScrollRestoration />
      <NameBanner />
      <Nav />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

export default Layout;
