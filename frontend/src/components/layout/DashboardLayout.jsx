import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return <div className="min-h-screen bg-brand-bg text-brand-text">
    <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    <main className="min-h-screen px-3 py-3 sm:px-4 lg:ml-64 lg:px-6 lg:py-5 xl:px-8">
      <div className="mx-auto w-full max-w-[1360px]">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <div className="min-w-0 pb-8">{children}</div>
      </div>
    </main>
  </div>;
}
