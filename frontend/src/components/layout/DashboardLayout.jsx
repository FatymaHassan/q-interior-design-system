import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return <div className="min-h-screen bg-brand-bg text-brand-text">
    <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    <main className="min-h-screen p-4 md:p-5 lg:ml-64 xl:p-5">
      <div className="mx-auto max-w-[1480px]">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <div className="pb-6">{children}</div>
      </div>
    </main>
  </div>;
}
