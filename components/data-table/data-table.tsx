import { cn } from "@/lib/utils/cn";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  className?: string;
  hideOnMobile?: boolean;
  cell: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  className,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-h-[4.5rem] overflow-x-auto",
        className,
      )}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            {columns.map((column) => (
              <th
                key={column.id}
                className={cn(
                  "px-4 py-2.5 font-medium",
                  column.hideOnMobile && "hidden md:table-cell",
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              className={cn(
                "transition-colors",
                onRowClick && "cursor-pointer hover:bg-[var(--surface-muted)]",
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={cn(
                    "px-4 py-2.5",
                    column.hideOnMobile && "hidden md:table-cell",
                    column.className,
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
