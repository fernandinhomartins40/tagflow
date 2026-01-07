import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export function useBarcodeScanner(containerId: string) {
  const [status, setStatus] = useState("idle");
  const [data, setData] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const start = useCallback(async () => {
    try {
      setStatus("iniciando");
      setData(null);
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          setData(decodedText);
          setStatus("lido");
          scanner.stop().catch(() => undefined);
        }
      );
      setStatus("lendo");
    } catch {
      setStatus("erro");
    }
  }, [containerId]);

  const stop = useCallback(() => {
    try {
      const scanner = scannerRef.current;
      if (scanner?.isScanning) {
        scanner.stop().catch(() => undefined);
      }
    } catch {
      // noop
    }
    setStatus("parado");
  }, [containerId]);

  useEffect(() => () => stop(), [stop]);

  return { data, status, start, stop };
}
