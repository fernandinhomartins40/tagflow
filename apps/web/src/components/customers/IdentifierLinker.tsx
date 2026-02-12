import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Nfc, Barcode, QrCode, Hash } from "lucide-react";
import { Button } from "../ui/button";
import { ScannerModal } from "../ScannerModal";
import { useNfcReader } from "../../hooks/useNfcReader";

interface IdentifierLinkerProps {
  customerId: string;
  customerName: string;
  onLink: (type: string, code: string, tabType: string) => Promise<void>;
  isLoading?: boolean;
  open: boolean;
  onClose: () => void;
}

function NfcDialog({
  onClose,
  onRead
}: {
  onClose: () => void;
  onRead: (value: string) => void;
}) {
  if (typeof document === "undefined") return null;
  const nfc = useNfcReader();
  const lastReadRef = useRef<string | null>(null);

  useEffect(() => {
    nfc.clear();
    nfc.start();
    return () => nfc.stop();
  }, []);

  useEffect(() => {
    if (!nfc.data) return;
    if (lastReadRef.current === nfc.data) return;
    lastReadRef.current = nfc.data;
    onRead(nfc.data);
  }, [nfc.data, onRead]);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-white p-5 text-center shadow-lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <span className="absolute inline-flex h-16 w-16 animate-ping rounded-full bg-emerald-200 opacity-70" />
          <Nfc className="relative h-8 w-8" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">Aguardando NFC</h3>
        <p className="mt-2 text-sm text-slate-600">
          Encoste a pulseira/cartao para ler o identificador automaticamente.
        </p>
        <div
          className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
            nfc.status === "lido"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : nfc.status === "detectado"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : nfc.status.includes("erro")
                  ? "border-rose-200 bg-rose-50 text-rose-600"
                  : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          {nfc.status === "lido" && nfc.data
            ? `Leitura OK: ${nfc.data}`
            : nfc.status === "detectado"
              ? "NFC detectado, mas o identificador nao foi lido. Tente outro cartao."
              : nfc.status.includes("erro")
                ? "Falha ao ler NFC. Tente novamente."
                : "Aguardando leitura NFC..."}
        </div>
        <Button className="mt-4 w-full" variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>,
    document.body
  );
}

export function IdentifierLinker({
  customerId,
  customerName,
  onLink,
  isLoading = false,
  open,
  onClose
}: IdentifierLinkerProps) {
  const [type, setType] = useState<"nfc" | "barcode" | "qr" | "manual">("nfc");
  const [code, setCode] = useState("");
  const [tabType, setTabType] = useState<"prepaid" | "credit">("prepaid");
  const [nfcDialogOpen, setNfcDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<"qr" | "barcode">("qr");

  const handleLink = async () => {
    if (!code.trim()) {
      alert("⚠️ Digite um código para vincular");
      return;
    }
    await onLink(type, code, tabType);
    setCode("");
    onClose();
  };

  const options = [
    { value: "nfc", label: "NFC", icon: Nfc },
    { value: "barcode", label: "Codigo", icon: Barcode },
    { value: "qr", label: "QR Code", icon: QrCode },
    { value: "manual", label: "Numeracao", icon: Hash }
  ] as const;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-brand-100 bg-white p-6 shadow-xl">
          {/* Header */}
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-slate-900">Vincular Identificador</h3>
            <p className="mt-1 text-sm text-slate-600">Cliente: {customerName}</p>
          </div>

          {/* Tipo de identificador */}
          <div className="mb-4 space-y-2">
            <p className="text-sm font-medium text-slate-700">Tipo de identificador:</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {options.map((option) => {
                const active = type === option.value;
                const isNfc = option.value === "nfc";
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setType(option.value);
                      if (option.value === "nfc") {
                        setNfcDialogOpen(true);
                      }
                      if (option.value === "barcode") {
                        setScannerMode("barcode");
                        setScannerOpen(true);
                      }
                      if (option.value === "qr") {
                        setScannerMode("qr");
                        setScannerOpen(true);
                      }
                    }}
                    className={`flex aspect-square flex-col items-center justify-center rounded-2xl border px-2 text-xs font-semibold transition ${
                      active
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-brand-100 bg-white text-slate-600"
                    } ${isNfc ? "relative animate-pulse border-emerald-300 bg-emerald-50 text-emerald-700" : ""}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="mt-1">{option.label}</span>
                    {isNfc && (
                      <span className="absolute -top-1 right-1 h-2 w-2 rounded-full bg-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tipo de comanda */}
          <div className="mb-4 space-y-2">
            <p className="text-sm font-medium text-slate-700">Tipo de comanda:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTabType("prepaid")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  tabType === "prepaid"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                Pré-pago
              </button>
              <button
                type="button"
                onClick={() => setTabType("credit")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  tabType === "credit"
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                Crédito
              </button>
            </div>
          </div>

          {/* Código */}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Código:</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`Codigo para ${customerName.split(" ")[0]}...`}
              className="w-full rounded-xl border border-brand-100 px-3 py-2"
              disabled={isLoading}
            />
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleLink} disabled={isLoading || !code.trim()}>
              {isLoading ? "Vinculando..." : "Vincular"}
            </Button>
          </div>
        </div>
      </div>

      {nfcDialogOpen && (
        <NfcDialog
          onClose={() => setNfcDialogOpen(false)}
          onRead={(value) => {
            if (value.trim()) {
              setCode(value);
            }
            setNfcDialogOpen(false);
          }}
        />
      )}

      {scannerOpen && (
        <ScannerModal
          open={scannerOpen}
          mode={scannerMode}
          onClose={() => setScannerOpen(false)}
          onScan={(value) => setCode(value)}
        />
      )}
    </>
  );
}
