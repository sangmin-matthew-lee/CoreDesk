export default function AuthLayout({ children }: { children: React.ReactNode }) {
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
      {children}
    </div>
  );
}
