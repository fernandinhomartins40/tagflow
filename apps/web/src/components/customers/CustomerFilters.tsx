import { Search, Filter, X } from "lucide-react";
import { useState, useEffect } from "react";
import type { CustomerFilters as Filters } from "../../hooks/useCustomers";
import type { Branch } from "../../types/api";

interface CustomerFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  branches?: Branch[];
}

export function CustomerFilters({ filters, onFiltersChange, branches = [] }: CustomerFiltersProps) {
  const [search, setSearch] = useState(filters.search || "");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({ ...filters, search: search || undefined });
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const hasActiveFilters = filters.branchId || filters.hasBalance !== undefined || filters.hasLimit !== undefined;

  const clearFilters = () => {
    setSearch("");
    onFiltersChange({});
  };

  return (
    <div className="space-y-3">
      {/* Busca principal */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, CPF ou telefone..."
          className="w-full rounded-xl border border-brand-100 py-2 pl-10 pr-10 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Toggle filtros avançados */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-brand-600"
        >
          <Filter className="h-4 w-4" />
          Filtros avançados
          {hasActiveFilters && (
            <span className="rounded-full bg-brand-500 px-2 py-0.5 text-xs text-white">
              Ativos
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Filtros avançados */}
      {showAdvanced && (
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
          {/* Filtro por filial */}
          {branches.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Filial
              </label>
              <select
                value={filters.branchId || ""}
                onChange={(e) =>
                  onFiltersChange({ ...filters, branchId: e.target.value || undefined })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro por saldo */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Saldo pré-pago
            </label>
            <select
              value={
                filters.hasBalance === undefined
                  ? "all"
                  : filters.hasBalance
                    ? "yes"
                    : "no"
              }
              onChange={(e) => {
                const value = e.target.value;
                onFiltersChange({
                  ...filters,
                  hasBalance: value === "all" ? undefined : value === "yes"
                });
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">Todos</option>
              <option value="yes">Com saldo</option>
              <option value="no">Sem saldo</option>
            </select>
          </div>

          {/* Filtro por limite */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Limite de crédito
            </label>
            <select
              value={
                filters.hasLimit === undefined ? "all" : filters.hasLimit ? "yes" : "no"
              }
              onChange={(e) => {
                const value = e.target.value;
                onFiltersChange({
                  ...filters,
                  hasLimit: value === "all" ? undefined : value === "yes"
                });
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">Todos</option>
              <option value="yes">Com limite</option>
              <option value="no">Sem limite</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
