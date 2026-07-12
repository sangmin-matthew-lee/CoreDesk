import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import db from "@/lib/db";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  // Pass false to getCurrentUser to prevent checking blocked status inside the auth helper,
  // which prevents circular redirect loops while allowing us to check it manually below.
  const user = await getCurrentUser(false);
  if (!user) {
    redirect("/login");
  }

  const dbUser = db
    .prepare("SELECT blocked, requires_password_change FROM users WHERE id = ?")
    .get(user.userId) as { blocked: number; requires_password_change: number } | undefined;

  if (!dbUser || dbUser.blocked === 1) {
    redirect("/api/auth/logout?reason=blocked");
  }

  if (dbUser.requires_password_change === 0) {
    redirect(user.dept === "Management" ? "/accounts" : "/sales");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 text-2xl font-bold text-indigo-600">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
          </svg>
          GEI CRM
        </div>
        <p className="text-sm text-gray-500 mt-1">Internal operations platform</p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
