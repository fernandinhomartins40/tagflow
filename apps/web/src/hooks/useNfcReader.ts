import { useCallback, useEffect, useRef, useState } from "react";

export function useNfcReader() {
  const [status, setStatus] = useState("idle");
  const [data, setData] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStatus("stopped");
  }, []);

  const start = useCallback(async () => {
    if (!("NDEFReader" in window)) {
      setStatus("NFC nao suportado");
      return;
    }

    try {
      setStatus("aguardando");
      const reader = new (window as any).NDEFReader();
      const controller = new AbortController();
      controllerRef.current = controller;
      await reader.scan({ signal: controller.signal });

      reader.onreading = (event: any) => {
        const record = event.message.records?.[0];
        if (record) {
          const textDecoder = new TextDecoder(record.encoding || "utf-8");
          const value = textDecoder.decode(record.data);
          setData(value);
          setStatus("lido");
        }
      };

      reader.onreadingerror = () => {
        setStatus("erro de leitura");
      };
    } catch (error) {
      setStatus("erro");
    }
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { data, status, start, stop };
}
