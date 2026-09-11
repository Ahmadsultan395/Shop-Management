export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { hasAnyUser } from "@/lib/db/users";
import { getSettings } from "@/lib/db/settings";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  if (!hasAnyUser()) {
    redirect("/setup");
  }

  const session = getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const settings = getSettings();

  return (
    <div className="relative flex h-screen overflow-hidden bg-paper">
      {/* Sidebar */}
      <Sidebar shopName={settings.shop_name} />

      {/* Main Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar username={session.username} />

        <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
      </div>

      {/* ================================
          Bottom Animated Watermark
          ================================ */}
      <div className="pointer-events-none fixed bottom-3 left-0 z-[9999] w-full overflow-hidden">
        <div className="animate-watermark flex items-center justify-center gap-3 whitespace-nowrap">
          {/* Name */}
          <span
            className="
              bg-gradient-to-r
              from-slate-700
              via-slate-900
              to-slate-500
              bg-clip-text
              text-xl
              font-black
              uppercase
              tracking-[0.3em]
              text-transparent
              opacity-20
              sm:text-4xl
            "
          >
            Ahmad
          </span>

          {/* Dot */}
          <span className="text-lg font-bold text-slate-500/15">•</span>

          {/* Number */}
          <span
            className="
              text-sm
              font-semibold
              tracking-[0.2em]
              text-slate-500/45
              sm:text-2xl
            "
          >
            03120685288
          </span>
        </div>
      </div>
    </div>
  );
}
