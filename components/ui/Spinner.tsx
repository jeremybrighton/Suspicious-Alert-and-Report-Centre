export default function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }[size];
  return (
    <div className={`${sizeClass} border-2 border-cyan-500 border-t-transparent rounded-full animate-spin`} />
  );
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-slate-400 text-sm">Loading...</span>
    </div>
  );
}
