import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = 'Failed to load data', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertTriangle size={24} className="text-red-400" />
      </div>
      <p className="text-slate-300 font-medium">Something went wrong</p>
      <p className="text-slate-500 text-sm mt-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
