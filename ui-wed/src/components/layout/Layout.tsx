import { Outlet } from "react-router-dom";
import NameBanner from "./NameBanner";
import Nav from "./Nav";
import Footer from "./Footer";

function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
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
