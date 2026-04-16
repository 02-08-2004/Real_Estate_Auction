import { useState } from "react";
import { Outlet } from "react-router-dom";
import TopHeader from "./TopHeader";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-container">
      <TopHeader onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="layout-body">
        <Sidebar isOpen={isSidebarOpen} />
        <main className="main-content" onClick={() => setIsSidebarOpen(false)}>
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
