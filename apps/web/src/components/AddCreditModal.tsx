import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui/button";
import { Banknote, CreditCard, QrCode, WalletCards } from "lucide-react";
import { formatCurrencyInput, parseCurrencyInput } from "../utils/currency";

export type PaymentMethod = "cash" | "debit" | "credit" | "pix";

interface AddCreditModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (amount: number, method: PaymentMethod) => void;
}

export function AddCreditModal({ open, onClose, onConfirm }: AddCreditModalProps) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-brand-100 bg-white p-5 shadow-lg dark:border-[#2a2420] dark:bg-[#120f0d] dark:text-neutral-100">
        <h3 className="text-lg font-semibold">Adicionar credito pre-pago</h3>
        <div className="mt-3 space-y-3">
          <input
            value={amount}
            onChange={(event) => setAmount(formatCurrencyInput(event.target.value))}
            placeholder="Valor"
            className="w-full rounded-xl border border-brand-100 px-3 py-2 dark:border-[#2a2420] dark:bg-[#1b1613] dark:text-neutral-100"
          />
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "cash", label: "Dinheiro", icon: Banknote },
              { value: "debit", label: "Debito", icon: CreditCard },
              { value: "credit", label: "Credito", icon: WalletCards },
              { value: "pix", label: "Pix", icon: QrCode }
            ].map((option) => {
              const active = method === option.value;
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMethod(option.value as PaymentMethod)}
                  className={`flex aspect-square flex-col items-center justify-center rounded-2xl border px-2 text-xs font-semibold transition ${
                    active
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400/60 dark:bg-brand-500/20 dark:text-brand-200"
                      : "border-brand-100 bg-white text-slate-600 dark:border-[#2a2420] dark:bg-[#1b1613] dark:text-neutral-300"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="mt-1">{option.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                const value = parseCurrencyInput(amount);
                if (!value) return;
                onConfirm(value, method);
                setAmount("");
                setMethod("cash");
                onClose();
              }}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
