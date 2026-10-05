import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  const isManagement = user?.dept === "Management" || user?.dept === "Super Admin";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.firstName}
        </h1>
        <p className="text-gray-500 text-lg">What would you like to work on?</p>
      </div>
      <div
        className={`grid ${
          isManagement ? "grid-cols-1 sm:grid-cols-3 max-w-3xl" : "grid-cols-1 max-w-sm"
        } gap-4 w-full`}
      >
        <Link
          href="/sales"
          className="group flex flex-col items-start gap-2 p-6 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all text-left"
        >
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5.356-3.712M9 20H4v-2a4 4 0 015.356-3.712M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-gray-900">Sales CRM</div>
            <div className="text-sm text-gray-500">Lead management & pipeline</div>
          </div>
        </Link>
        {isManagement && (
          <Link
            href="/projects"
            className="group flex flex-col items-start gap-2 p-6 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all text-left"
          >
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Project Management</div>
              <div className="text-sm text-gray-500">OBF retrofits, PG&E review & execution</div>
            </div>
          </Link>
        )}
        {isManagement && (
          <Link
            href="/service-calls"
            className="group flex flex-col items-start gap-2 p-6 bg-white border border-gray-200 rounded-xl hover:border-amber-300 hover:shadow-md transition-all text-left"
          >
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Service Calls</div>
              <div className="text-sm text-gray-500">Customer service & dispatch</div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
