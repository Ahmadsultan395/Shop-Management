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
    <div className="flex h-screen overflow-hidden bg-paper">
      {/* Sidebar */}
      <Sidebar shopName={settings.shop_name} />

      {/* Main Area */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar username={session.username} />

        {/* Content */}
        <main className="relative flex-1 overflow-y-auto px-8 py-6">
          {/* ================= WATERMARK ================= */}
          <div
            className="
              pointer-events-none
              absolute
              inset-x-0
              bottom-0
              z-0
              flex
              justify-center
              select-none
            "
            aria-hidden="true"
          >
            <div
              className="
                mb-8
                whitespace-nowrap
                text-center
                text-3xl
                font-bold
                uppercase
                tracking-[0.3em]
                text-slate-400/30
              "
            >
              AHMAD
              <span className="mx-5 text-xl font-medium tracking-normal">
                •
              </span>
              <span className="text-xl font-semibold tracking-[0.15em]">
                03120685288
              </span>
            </div>
          </div>

          {/* ================= PAGE CONTENT ================= */}
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
