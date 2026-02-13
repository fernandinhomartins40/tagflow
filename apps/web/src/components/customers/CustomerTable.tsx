import { useState } from "react";
import {
  MoreVertical,
  Edit,
  Trash2,
  CreditCard,
  Link2,
  ChevronDown,
  ChevronUp,
  Nfc,
  Barcode,
  QrCode,
  Hash,
  Users
} from "lucide-react";
import type { Customer } from "../../types/api";
import { maskCpfPrivacy, maskPhonePrivacy } from "../../utils/customer";
import { Button } from "../ui/button";

interface CustomerTableProps {
  customers: Customer[];
  isLoading: boolean;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onAddCredit: (customer: Customer) => void;
  onLinkIdentifier: (customer: Customer) => void;
}

const formatCurrencyDisplay = (value: number | string | null | undefined): string => {
  const num = typeof value === "string" ? parseFloat(value) || 0 : value || 0;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const getIdentifierIcon = (type: string) => {
  switch (type) {
    case "nfc":    return Nfc;
    case "barcode": return Barcode;
    case "qr":     return QrCode;
    case "manual": return Hash;
    default:       return Hash;
  }
};

/** Hook interno para gerenciar o estado de expand + fetch de identificadores */
function useCustomerExpand(customerId: string) {
  const [expanded, setExpanded] = useState(false);
  const [identifiers, setIdentifiers] = useState<any[]>([]);
  const [identifiersLoading, setIdentifiersLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const toggle = async () => {
    if (!fetched) {
      setIdentifiersLoading(true);
      try {
        const res = await fetch(`/api/customers/${customerId}/identifiers`);
        const data = await res.json();
        setIdentifiers(data.identifiers || []);
        setFetched(true);
      } catch (err) {
        console.error("Erro ao carregar identificadores:", err);
      } finally {
        setIdentifiersLoading(false);
      }
    }
    setExpanded((prev) => !prev);
  };

  return { expanded, identifiers, identifiersLoading, toggle };
}

/** Menu de ações (reutilizado em desktop e mobile) */
function ActionMenu({
  customer,
  onEdit,
  onDelete,
  onAddCredit,
  onLinkIdentifier
}: {
  customer: Customer;
  onEdit: (c: Customer) => void;
  onDelete: (c: Customer) => void;
  onAddCredit: (c: Customer) => void;
  onLinkIdentifier: (c: Customer) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            <button
              onClick={() => { onEdit(customer); setOpen(false); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <Edit className="h-4 w-4" />
              Editar cadastro
            </button>
            <button
              onClick={() => { onAddCredit(customer); setOpen(false); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <CreditCard className="h-4 w-4" />
              Adicionar crédito
            </button>
            <button
              onClick={() => { onLinkIdentifier(customer); setOpen(false); }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <Link2 className="h-4 w-4" />
              Vincular identificador
            </button>
            <div className="my-1 border-t border-slate-200" />
            <button
              onClick={() => {
                if (confirm(`Excluir ${customer.name}? Esta ação não pode ser desfeita.`)) {
                  onDelete(customer);
                }
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Painel expandido: botões de ação + lista de identificadores */
function ExpandedPanel({
  customer,
  identifiers,
  identifiersLoading,
  onAddCredit,
  onLinkIdentifier
}: {
  customer: Customer;
  identifiers: any[];
  identifiersLoading: boolean;
  onAddCredit: (c: Customer) => void;
  onLinkIdentifier: (c: Customer) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Ações rápidas */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAddCredit(customer)}
          className="flex items-center gap-1.5"
        >
          <CreditCard className="h-3.5 w-3.5" />
          Adicionar crédito pré-pago
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onLinkIdentifier(customer)}
          className="flex items-center gap-1.5"
        >
          <Link2 className="h-3.5 w-3.5" />
          Vincular identificador
        </Button>
      </div>

      {/* Identificadores */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Identificadores vinculados
        </p>
        {identifiersLoading ? (
          <div className="flex gap-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-8 w-32 animate-pulse rounded-lg bg-slate-200" />
            ))}
          </div>
        ) : identifiers.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {identifiers.map((identifier: any) => {
              const Icon = getIdentifierIcon(identifier.type);
              return (
                <div
                  key={identifier.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm"
                >
                  <Icon className="h-3.5 w-3.5 text-slate-500" />
                  <span className="font-mono text-sm text-slate-900">{identifier.code}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      identifier.tabType === "credit"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {identifier.tabType === "credit" ? "Crédito" : "Pré-pago"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Nenhum identificador vinculado ainda.</p>
        )}
      </div>
    </div>
  );
}

/** Linha para tabela desktop/tablet (sm+) */
function DesktopRow({
  customer,
  onEdit,
  onDelete,
  onAddCredit,
  onLinkIdentifier
}: {
  customer: Customer;
  onEdit: (c: Customer) => void;
  onDelete: (c: Customer) => void;
  onAddCredit: (c: Customer) => void;
  onLinkIdentifier: (c: Customer) => void;
}) {
  const { expanded, identifiers, identifiersLoading, toggle } = useCustomerExpand(customer.id);

  return (
    <>
      <tr className="border-b border-slate-200 hover:bg-slate-50">
        {/* Nome — max-w-0 obrigatório com table-fixed para truncar */}
        <td className="max-w-0 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={toggle}
              className="shrink-0 text-slate-400 transition hover:text-slate-600"
              title={expanded ? "Recolher" : "Expandir detalhes"}
            >
              {expanded
                ? <ChevronUp className="h-4 w-4" />
                : <ChevronDown className="h-4 w-4" />
              }
            </button>
            <div className="min-w-0 overflow-hidden">
              <div className="truncate font-medium text-slate-900">{customer.name}</div>
              {customer.email && (
                <div className="truncate text-xs text-slate-500">{customer.email}</div>
              )}
            </div>
          </div>
        </td>

        {/* CPF */}
        <td className="hidden px-4 py-3 text-sm text-slate-600 md:table-cell">
          <span className="font-mono text-xs">{maskCpfPrivacy(customer.cpf || "")}</span>
        </td>

        {/* Telefone */}
        <td className="hidden px-4 py-3 text-sm text-slate-600 lg:table-cell">
          <span className="font-mono text-xs">{maskPhonePrivacy(customer.phone || "")}</span>
        </td>

        {/* Saldo */}
        <td className="px-4 py-3 text-sm">
          <span className={`font-medium ${parseFloat(customer.credits || "0") > 0 ? "text-emerald-600" : "text-slate-400"}`}>
            {formatCurrencyDisplay(customer.credits)}
          </span>
        </td>

        {/* Limite */}
        <td className="hidden px-4 py-3 text-sm lg:table-cell">
          <span className={`font-medium ${parseFloat(customer.creditLimit || "0") > 0 ? "text-purple-600" : "text-slate-400"}`}>
            {formatCurrencyDisplay(customer.creditLimit)}
          </span>
        </td>

        {/* Ações */}
        <td className="px-4 py-3 text-right">
          <ActionMenu
            customer={customer}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddCredit={onAddCredit}
            onLinkIdentifier={onLinkIdentifier}
          />
        </td>
      </tr>

      {/* Linha expandida */}
      {expanded && (
        <tr>
          <td colSpan={6} className="border-b border-slate-200 bg-slate-50 px-6 pb-4 pt-2">
            <ExpandedPanel
              customer={customer}
              identifiers={identifiers}
              identifiersLoading={identifiersLoading}
              onAddCredit={onAddCredit}
              onLinkIdentifier={onLinkIdentifier}
            />
          </td>
        </tr>
      )}
    </>
  );
}

/** Card para mobile (< sm) */
function MobileCard({
  customer,
  onEdit,
  onDelete,
  onAddCredit,
  onLinkIdentifier
}: {
  customer: Customer;
  onEdit: (c: Customer) => void;
  onDelete: (c: Customer) => void;
  onAddCredit: (c: Customer) => void;
  onLinkIdentifier: (c: Customer) => void;
}) {
  const { expanded, identifiers, identifiersLoading, toggle } = useCustomerExpand(customer.id);

  return (
    <div className="p-4">
      {/* Linha principal */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={toggle}
            className="shrink-0 text-slate-400 transition hover:text-slate-600"
          >
            {expanded
              ? <ChevronUp className="h-4 w-4" />
              : <ChevronDown className="h-4 w-4" />
            }
          </button>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{customer.name}</p>
            {customer.cpf && (
              <p className="font-mono text-xs text-slate-500">{maskCpfPrivacy(customer.cpf)}</p>
            )}
          </div>
        </div>

        <ActionMenu
          customer={customer}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddCredit={onAddCredit}
          onLinkIdentifier={onLinkIdentifier}
        />
      </div>

      {/* Saldos */}
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        <span className={parseFloat(customer.credits || "0") > 0 ? "font-medium text-emerald-600" : "text-slate-400"}>
          Saldo: {formatCurrencyDisplay(customer.credits)}
        </span>
        {parseFloat(customer.creditLimit || "0") > 0 && (
          <span className="font-medium text-purple-600">
            Limite: {formatCurrencyDisplay(customer.creditLimit)}
          </span>
        )}
        {customer.phone && (
          <span className="font-mono text-slate-500">{maskPhonePrivacy(customer.phone)}</span>
        )}
      </div>

      {/* Expandido */}
      {expanded && (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <ExpandedPanel
            customer={customer}
            identifiers={identifiers}
            identifiersLoading={identifiersLoading}
            onAddCredit={onAddCredit}
            onLinkIdentifier={onLinkIdentifier}
          />
        </div>
      )}
    </div>
  );
}

export function CustomerTable({
  customers,
  isLoading,
  onEdit,
  onDelete,
  onAddCredit,
  onLinkIdentifier
}: CustomerTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="animate-pulse space-y-px">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-4 w-4 rounded bg-slate-200" />
              <div className="h-4 flex-1 rounded bg-slate-200" />
              <div className="hidden h-4 w-28 rounded bg-slate-200 md:block" />
              <div className="hidden h-4 w-24 rounded bg-slate-200 lg:block" />
              <div className="h-4 w-20 rounded bg-slate-200" />
              <div className="h-4 w-8 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <Users className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-slate-900">
          Nenhum cliente encontrado
        </h3>
        <p className="text-sm text-slate-600">
          Comece cadastrando o primeiro cliente ou ajuste os filtros de busca.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Desktop / tablet: tabela */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full table-fixed">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {/* Nome: ocupa o espaço restante */}
              <th className="w-auto px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Nome
              </th>
              {/* CPF: largura fixa, oculto em <md */}
              <th className="hidden w-36 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 md:table-cell">
                CPF
              </th>
              {/* Telefone: largura fixa, oculto em <lg */}
              <th className="hidden w-36 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 lg:table-cell">
                Telefone
              </th>
              {/* Saldo: largura fixa */}
              <th className="w-28 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Saldo
              </th>
              {/* Limite: largura fixa, oculto em <lg */}
              <th className="hidden w-28 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 lg:table-cell">
                Limite
              </th>
              {/* Ações: largura mínima fixa */}
              <th className="w-14 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <DesktopRow
                key={customer.id}
                customer={customer}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddCredit={onAddCredit}
                onLinkIdentifier={onLinkIdentifier}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="divide-y divide-slate-200 sm:hidden">
        {customers.map((customer) => (
          <MobileCard
            key={customer.id}
            customer={customer}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddCredit={onAddCredit}
            onLinkIdentifier={onLinkIdentifier}
          />
        ))}
      </div>
    </div>
  );
}
