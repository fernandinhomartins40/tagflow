import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  pageSize: number;
  total?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function Pagination({
  currentPage,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange
}: PaginationProps) {
  const totalPages = total ? Math.ceil(total / pageSize) : undefined;
  const hasNext = totalPages ? currentPage < totalPages : true;
  const hasPrev = currentPage > 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      {/* Itens por página */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Exibir:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
        <span className="text-sm text-slate-600">por página</span>
      </div>

      {/* Controles de navegação */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrev}
          className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>

        <div className="flex items-center gap-1 px-2">
          <span className="text-sm font-medium text-slate-900">Página {currentPage}</span>
          {totalPages && (
            <span className="text-sm text-slate-500">de {totalPages}</span>
          )}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext}
          className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Próximo
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Total de registros */}
      {total !== undefined && (
        <div className="text-sm text-slate-600">
          Total: <span className="font-medium text-slate-900">{total}</span> cliente{total !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
