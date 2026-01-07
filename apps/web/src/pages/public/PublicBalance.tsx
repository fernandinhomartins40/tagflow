import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { apiFetch } from "../../services/api";
import { ScannerModal } from "../../components/ScannerModal";
import { useNfcReader } from "../../hooks/useNfcReader";

interface BalanceResponse {
  balance: string;
}

export function PublicBalance() {
  const [manual, setManual] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const nfc = useNfcReader();
  const [balance, setBalance] = useState<string | null>(null);

  const balanceMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch<BalanceResponse>(`/api/public/balance/${id}`);
    },
    onSuccess: (data) => setBalance(data.balance)
  });

  const currentId = nfc.data || manual;

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Consulta de saldo</h2>
        <p className="text-sm text-slate-600">Use NFC, camera ou numero manual.</p>
      </header>
      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-brand-400">Leitura rapida</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => nfc.start()}>
            Ler NFC
          </Button>
          <Button variant="outline" onClick={() => setScannerOpen(true)}>
            Scan camera
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Status: {nfc.status}</p>
      </div>
      <div className="rounded-2xl border border-brand-100 bg-white p-4">
        <label className="text-xs uppercase tracking-[0.2em] text-brand-400">Numero manual</label>
        <input
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          placeholder="Digite seu identificador"
          className="mt-2 w-full rounded-xl border border-brand-100 px-3 py-2"
        />
        <Button className="mt-3" onClick={() => currentId && balanceMutation.mutate(currentId)}>
          Consultar
        </Button>
        <div className="mt-4 rounded-xl bg-brand-50 p-4">
          <p className="text-sm text-slate-600">Identificador atual:</p>
          <p className="text-lg font-semibold text-slate-900">{currentId || "--"}</p>
          <p className="mt-2 text-2xl font-semibold text-brand-600">R$ {balance ?? "0,00"}</p>
        </div>
      </div>
      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(value) => setManual(value)}
      />
    </section>
  );
}
