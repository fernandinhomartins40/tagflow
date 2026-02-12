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
  Hash
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
    case "nfc":
      return Nfc;
    case "barcode":
      return Barcode;
    case "qr":
      return QrCode;
    case "manual":
      return Hash;
    default:
      return Hash;
  }
};

function CustomerRow({ customer, onEdit, onDelete, onAddCredit, onLinkIdentifier }: {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onAddCredit: (customer: Customer) => void;
  onLinkIdentifier: (customer: Customer) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [identifiers, setIdentifiers] = useState<any[]>([]);
  const [identifiersLoading, setIdentifiersLoading] = useState(false);

  const handleExpand = async () => {
    if (!expanded && identifiers.length === 0) {
      setIdentifiersLoading(true);
      try {
        const response = await fetch(`/api/customers/${customer.id}/identifiers`);
        const data = await response.json();
        setIdentifiers(data.identifiers || []);
      } catch (error) {
        console.error("Erro ao carregar identificadores:", error);
      } finally {
        setIdentifiersLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  return (
    <>
      <tr className="border-b border-slate-200 hover:bg-slate-50">
        {/* Nome */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExpand}
              className="text-slate-400 transition hover:text-slate-600"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            <div>
              <div className="font-medium text-slate-900">{customer.name}</div>
              {customer.email && (
                <div className="text-xs text-slate-500">{customer.email}</div>
              )}
            </div>
          </div>
        </td>

        {/* CPF */}
        <td className="hidden px-4 py-3 text-sm text-slate-600 md:table-cell">
          <span className="font-mono">{maskCpfPrivacy(customer.cpf || "")}</span>
        </td>

        {/* Telefone */}
        <td className="hidden px-4 py-3 text-sm text-slate-600 lg:table-cell">
          <span className="font-mono">{maskPhonePrivacy(customer.phone || "")}</span>
        </td>

        {/* Saldo */}
        <td className="px-4 py-3 text-sm">
          <span
            className={`font-medium ${parseFloat(customer.credits || "0") > 0 ? "text-emerald-600" : "text-slate-400"}`}
          >
            {formatCurrencyDisplay(customer.credits)}
          </span>
        </td>

        {/* Limite */}
        <td className="hidden px-4 py-3 text-sm sm:table-cell">
          <span
            className={`font-medium ${parseFloat(customer.creditLimit || "0") > 0 ? "text-purple-600" : "text-slate-400"}`}
          >
            {formatCurrencyDisplay(customer.creditLimit)}
          </span>
        </td>

        {/* Ações */}
        <td className="px-4 py-3 text-right">
          <div className="relative inline-block">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => {
                      onEdit(customer);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      onAddCredit(customer);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <CreditCard className="h-4 w-4" />
                    Adicionar crédito
                  </button>
                  <button
                    onClick={() => {
                      onLinkIdentifier(customer);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Link2 className="h-4 w-4" />
                    Vincular identificador
                  </button>
                  <div className="my-1 border-t border-slate-200" />
                  <button
                    onClick={() => {
                      if (confirm(`Tem certeza que deseja excluir ${customer.name}?`)) {
                        onDelete(customer);
                      }
                      setMenuOpen(false);
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
        </td>
      </tr>

      {/* Linha expandida - Identificadores */}
      {expanded && (
        <tr>
          <td colSpan={6} className="bg-slate-50 px-4 py-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-700">
                Identificadores vinculados:
              </p>
              {identifiersLoading ? (
                <p className="text-sm text-slate-500">Carregando...</p>
              ) : identifiers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {identifiers.map((identifier: any) => {
                    const Icon = getIdentifierIcon(identifier.type);
                    return (
                      <div
                        key={identifier.id}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <Icon className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-mono text-slate-900">
                          {identifier.code}
                        </span>
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
                <p className="text-sm text-slate-500">Nenhum identificador vinculado</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
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
        <div className="animate-pulse space-y-2 p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-12 flex-1 rounded bg-slate-200" />
              <div className="h-12 w-32 rounded bg-slate-200" />
              <div className="h-12 w-32 rounded bg-slate-200" />
              <div className="h-12 w-24 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <CreditCard className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Nenhum cliente encontrado
        </h3>
        <p className="text-sm text-slate-600">
          Comece cadastrando o primeiro cliente ou ajuste os filtros de busca.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
              Nome
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 md:table-cell">
              CPF
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 lg:table-cell">
              Telefone
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
              Saldo
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 sm:table-cell">
              Limite
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <CustomerRow
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
  );
}
