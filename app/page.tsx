import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">CoreDesk</h1>
        <p className="text-gray-500 text-lg">Internal tools for your team</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        <Link
          href="/sales"
          className="group flex flex-col items-start gap-2 p-6 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all"
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
        <div className="flex flex-col items-start gap-2 p-6 bg-gray-50 border border-dashed border-gray-200 rounded-xl opacity-50">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-gray-700">Project Management</div>
            <div className="text-sm text-gray-400">Coming soon</div>
          </div>
        </div>
      </div>
    </div>
  );
}
