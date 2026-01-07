import { useEffect } from "react";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { Button } from "./ui/button";

interface ScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
}

export function ScannerModal({ open, onClose, onScan }: ScannerModalProps) {
  const containerId = "barcode-scanner";
  const { data, status, start, stop } = useBarcodeScanner(containerId);

  useEffect(() => {
    if (open) {
      // Reset previous scan
      if (data) {
        // no-op, data is handled below
      }
      start();
    } else {
      stop();
    }
  }, [open, start, stop]);

  useEffect(() => {
    if (data) {
      onScan(data);
      onClose();
    }
  }, [data, onClose, onScan]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Scanner de codigo</h3>
          <Button size="sm" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
        <div id={containerId} className="mt-4 overflow-hidden rounded-xl bg-slate-100" />
        <p className="mt-2 text-xs text-slate-500">Status: {status}</p>
      </div>
    </div>
  );
}
