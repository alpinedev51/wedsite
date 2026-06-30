import { Outlet } from "react-router-dom";
import Nav from "./Nav";
import Footer from "./Footer";

function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

export default Layout;
