export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen gradient-header flex flex-col items-center">
      {/* Logo */}
      <div className="pt-12 pb-6 text-center w-full">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-3">
          <span className="text-3xl">&#9917;</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          JUGA FULBITO
        </h1>
        <p className="text-primary-200 text-sm mt-1">Organiza tu picadito</p>
      </div>

      {/* Card */}
      <div className="flex-1 w-full max-w-md bg-white rounded-t-3xl px-6 pt-8 pb-8">
        {children}
      </div>
    </div>
  );
}
