import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, total, pageSize, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-1 py-3">
      <p className="text-slate-400 text-sm">
        Showing <span className="text-slate-200">{start}–{end}</span> of <span className="text-slate-200">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-sm text-slate-400">
          Page <span className="text-slate-200 font-medium">{page}</span> of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
