export default function AdminPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white">
          {title}
        </h1>
        <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8]">
          {description}
        </p>
      </header>
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-[#1E293B] dark:bg-[#0F172A] dark:shadow-none">
        {children}
      </div>
    </div>
  );
}