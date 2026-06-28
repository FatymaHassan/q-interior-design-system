import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return <div className="min-h-screen bg-brand-bg text-brand-text">
    <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    <main className="min-h-screen px-3 py-3 sm:px-4 lg:ml-64 lg:px-5 lg:py-4 xl:px-6">
      <div className="mx-auto w-full max-w-[1320px]">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <div className="min-w-0 pb-6">{children}</div>
      </div>
    </main>
  </div>;
}
