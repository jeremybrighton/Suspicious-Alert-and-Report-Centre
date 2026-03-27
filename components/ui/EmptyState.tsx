import { InboxIcon } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export default function EmptyState({
  title = 'No data found',
  description = 'There are no records to display.',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-14 w-14 rounded-full bg-slate-800 flex items-center justify-center mb-4">
        <InboxIcon size={24} className="text-slate-500" />
      </div>
      <p className="text-slate-300 font-medium">{title}</p>
      <p className="text-slate-500 text-sm mt-1">{description}</p>
    </div>
  );
}
