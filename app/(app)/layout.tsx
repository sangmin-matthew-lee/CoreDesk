import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import db from "@/lib/db";
import LogoutButton from "@/components/LogoutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser(false);
  if (!user) redirect("/login");

  const dbUser = db
    .prepare("SELECT blocked, requires_password_change FROM users WHERE id = ?")
    .get(user.userId) as { blocked: number; requires_password_change: number } | undefined;

  if (!dbUser || dbUser.blocked === 1) {
    redirect("/api/auth/logout?reason=blocked");
  }

  if (dbUser.requires_password_change === 1) {
    redirect("/change-password");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-indigo-600 text-lg tracking-tight">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
            </svg>
            CoreDesk
          </Link>

          <nav className="flex items-center gap-1 flex-1">
            <Link
              href="/sales"
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
            >
              Sales CRM
            </Link>
            {user.dept === "Management" && (
              <Link
                href="/accounts"
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
              >
                Account Manage
              </Link>
            )}
          </nav>


          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-none">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{user.dept}</p>
            </div>
            <span
              className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                user.dept === "Management"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {user.dept}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
