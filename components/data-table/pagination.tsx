import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function DataTablePagination({
  total,
  limit,
  offset,
  onPageChange,
  className,
}: PaginationProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-xs text-[var(--muted)]">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <span className="text-xs text-[var(--muted)]">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
