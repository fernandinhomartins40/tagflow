import { useEffect } from "react";
import { useCameraScanner, type CameraScanMode } from "../hooks/useCameraScanner";
import { Button } from "./ui/button";

interface ScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
  mode: CameraScanMode;
}

export function ScannerModal({ open, onClose, onScan, mode }: ScannerModalProps) {
  const containerId = `camera-scanner-${mode}`;
  const { data, status, start, stop } = useCameraScanner(containerId, mode);

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
      <div className="w-full max-w-md rounded-2xl bg-white p-4 dark:bg-[#120f0d] dark:text-neutral-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{mode === "qr" ? "Scanner de QR Code" : "Scanner de codigo de barras"}</h3>
          <Button size="sm" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
        {mode === "qr" ? (
          <div className="relative mt-4 overflow-hidden rounded-xl bg-slate-100 dark:bg-[#1b1613]">
            <div id={containerId} className="min-h-[260px]" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-48 w-48">
                <span className="absolute left-0 top-0 h-6 w-6 border-l-4 border-t-4 border-emerald-500" />
                <span className="absolute right-0 top-0 h-6 w-6 border-r-4 border-t-4 border-emerald-500" />
                <span className="absolute bottom-0 left-0 h-6 w-6 border-b-4 border-l-4 border-emerald-500" />
                <span className="absolute bottom-0 right-0 h-6 w-6 border-b-4 border-r-4 border-emerald-500" />
                <div className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 bg-emerald-400/80 animate-pulse" />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative mt-4 overflow-hidden rounded-xl bg-slate-100 dark:bg-[#1b1613]">
            <video id={containerId} className="w-full" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-24 w-64 max-w-[80%] rounded-2xl border-2 border-emerald-500/70">
                <div className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 bg-emerald-400/80 animate-pulse" />
              </div>
            </div>
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500 dark:text-neutral-400">Status: {status}</p>
      </div>
    </div>
  );
}
