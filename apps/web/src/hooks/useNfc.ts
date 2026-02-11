import { useCallback, useEffect, useRef, useState } from "react";

export type NfcStatus =
  | "idle"
  | "checking-support"
  | "not-supported"
  | "permission-denied"
  | "scanning"
  | "writing"
  | "read-success"
  | "write-success"
  | "read-error"
  | "write-error"
  | "stopped";

export type NfcRecordType = "text" | "url" | "mime" | "absolute-url" | "external" | "unknown";

export interface NfcRecord {
  recordType: NfcRecordType;
  data: string;
  id?: string;
  lang?: string;
  mediaType?: string;
}

export interface NfcReadEvent {
  serialNumber: string;
  records: NfcRecord[];
  rawMessage?: any;
}

export interface NfcError {
  type: "not-supported" | "permission-denied" | "not-readable" | "network" | "unknown";
  message: string;
  originalError?: any;
}

export interface UseNfcOptions {
  onRead?: (event: NfcReadEvent) => void;
  onWrite?: () => void;
  onError?: (error: NfcError) => void;
  autoStart?: boolean;
}

export function useNfc(options: UseNfcOptions = {}) {
  const [status, setStatus] = useState<NfcStatus>("idle");
  const [data, setData] = useState<NfcReadEvent | null>(null);
  const [error, setError] = useState<NfcError | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  const readerRef = useRef<any>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Verifica se NFC é suportado
  const checkSupport = useCallback(() => {
    setStatus("checking-support");

    // Verifica HTTPS (exceto localhost)
    if (typeof window !== "undefined") {
      if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
        const err: NfcError = {
          type: "not-supported",
          message: "NFC requer HTTPS. A aplicação deve ser servida via HTTPS."
        };
        setError(err);
        setStatus("not-supported");
        setIsSupported(false);
        options.onError?.(err);
        return false;
      }
    }

    // Verifica se NDEFReader existe
    if (!("NDEFReader" in window)) {
      const err: NfcError = {
        type: "not-supported",
        message: "Web NFC API não é suportada neste navegador. Use Chrome, Edge ou Opera no Android."
      };
      setError(err);
      setStatus("not-supported");
      setIsSupported(false);
      options.onError?.(err);
      return false;
    }

    setIsSupported(true);
    setStatus("idle");
    return true;
  }, [options]);

  // Solicita permissão NFC
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Verifica permissões via Permissions API
      if ("permissions" in navigator) {
        try {
          const permissionStatus = await (navigator.permissions as any).query({ name: "nfc" });

          if (permissionStatus.state === "granted") {
            setHasPermission(true);
            return true;
          }

          if (permissionStatus.state === "denied") {
            const err: NfcError = {
              type: "permission-denied",
              message: "Permissão NFC negada. Ative NFC nas configurações do navegador."
            };
            setError(err);
            setStatus("permission-denied");
            setHasPermission(false);
            options.onError?.(err);
            return false;
          }
        } catch (e) {
          // Permissions API pode não suportar 'nfc', continuar tentando scan
          console.warn("Permissions API não suporta NFC, tentando scan direto", e);
        }
      }

      // Tenta criar reader (isso pode solicitar permissão)
      return true;
    } catch (err: any) {
      const nfcError: NfcError = {
        type: "permission-denied",
        message: "Erro ao verificar permissões NFC",
        originalError: err
      };
      setError(nfcError);
      setStatus("permission-denied");
      options.onError?.(nfcError);
      return false;
    }
  }, [options]);

  // Decodifica dados do registro NDEF
  const decodeRecord = useCallback((record: any): NfcRecord => {
    try {
      const decoder = new TextDecoder(record.encoding || "utf-8");
      let data = "";

      if (record.data) {
        data = decoder.decode(record.data);
      }

      return {
        recordType: record.recordType || "unknown",
        data,
        id: record.id || undefined,
        lang: record.lang || undefined,
        mediaType: record.mediaType || undefined
      };
    } catch (err) {
      console.error("Erro ao decodificar registro:", err);
      return {
        recordType: "unknown",
        data: ""
      };
    }
  }, []);

  // Inicia escaneamento
  const startScan = useCallback(async () => {
    setError(null);

    if (!checkSupport()) {
      return;
    }

    const hasPerms = await requestPermission();
    if (!hasPerms) {
      return;
    }

    try {
      setStatus("scanning");
      setData(null);

      const reader = new (window as any).NDEFReader();
      readerRef.current = reader;

      const controller = new AbortController();
      controllerRef.current = controller;

      await reader.scan({ signal: controller.signal });
      console.log("NFC scan iniciado com sucesso");

      reader.onreading = (event: any) => {
        console.log("NFC Tag detectado:", event);

        const serialNumber = event.serialNumber || "";
        const records: NfcRecord[] = [];

        if (event.message && event.message.records) {
          for (const record of event.message.records) {
            records.push(decodeRecord(record));
          }
        }

        const readEvent: NfcReadEvent = {
          serialNumber,
          records,
          rawMessage: event.message
        };

        setData(readEvent);
        setStatus("read-success");
        options.onRead?.(readEvent);
      };

      reader.onreadingerror = (event: any) => {
        console.error("Erro ao ler NFC:", event);
        const err: NfcError = {
          type: "not-readable",
          message: "Tag NFC detectado mas não pode ser lido. Tente aproximar novamente ou use outra tag.",
          originalError: event
        };
        setError(err);
        setStatus("read-error");
        options.onError?.(err);
      };

    } catch (err: any) {
      console.error("Erro ao iniciar scan NFC:", err);

      let errorType: NfcError["type"] = "unknown";
      let message = "Erro desconhecido ao iniciar leitura NFC";

      if (err.name === "NotAllowedError") {
        errorType = "permission-denied";
        message = "Permissão NFC negada. Verifique as configurações do navegador.";
      } else if (err.name === "NotSupportedError") {
        errorType = "not-supported";
        message = "Hardware NFC não encontrado ou não suportado neste dispositivo.";
      } else if (err.name === "NotReadableError") {
        errorType = "not-readable";
        message = "Não foi possível acessar o hardware NFC.";
      }

      const nfcError: NfcError = {
        type: errorType,
        message,
        originalError: err
      };

      setError(nfcError);
      setStatus("read-error");
      options.onError?.(nfcError);
    }
  }, [checkSupport, requestPermission, decodeRecord, options]);

  // Para escaneamento
  const stopScan = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    readerRef.current = null;
    setStatus("stopped");
  }, []);

  // Escreve dados em tag NFC
  const write = useCallback(async (
    data: string | NfcRecord[],
    writeOptions?: { overwrite?: boolean }
  ): Promise<boolean> => {
    setError(null);

    if (!checkSupport()) {
      return false;
    }

    const hasPerms = await requestPermission();
    if (!hasPerms) {
      return false;
    }

    try {
      setStatus("writing");

      const reader = new (window as any).NDEFReader();

      let records: any[];

      if (typeof data === "string") {
        // String simples, cria registro de texto
        records = [{
          recordType: "text",
          data
        }];
      } else {
        // Array de registros personalizados
        records = data.map(record => ({
          recordType: record.recordType,
          data: record.data,
          id: record.id,
          lang: record.lang,
          mediaType: record.mediaType
        }));
      }

      const ndefWriteOptions: any = {};
      if (writeOptions?.overwrite !== undefined) {
        ndefWriteOptions.overwrite = writeOptions.overwrite;
      }

      await reader.write({
        records
      }, ndefWriteOptions);

      console.log("NFC escrito com sucesso:", records);
      setStatus("write-success");
      options.onWrite?.();

      return true;

    } catch (err: any) {
      console.error("Erro ao escrever NFC:", err);

      let errorType: NfcError["type"] = "unknown";
      let message = "Erro desconhecido ao escrever na tag NFC";

      if (err.name === "NotAllowedError") {
        errorType = "permission-denied";
        message = "Permissão NFC negada para escrita.";
      } else if (err.name === "NotSupportedError") {
        errorType = "not-supported";
        message = "Escrita NFC não suportada neste dispositivo.";
      } else if (err.name === "NotReadableError") {
        errorType = "not-readable";
        message = "Tag NFC não pode ser escrita. Verifique se a tag não está protegida contra escrita.";
      } else if (err.name === "NetworkError") {
        errorType = "network";
        message = "Tag NFC foi removida durante a escrita. Mantenha a tag próxima até concluir.";
      }

      const nfcError: NfcError = {
        type: errorType,
        message,
        originalError: err
      };

      setError(nfcError);
      setStatus("write-error");
      options.onError?.(nfcError);

      return false;
    }
  }, [checkSupport, requestPermission, options]);

  // Limpa dados lidos
  const clear = useCallback(() => {
    setData(null);
    setError(null);
    setStatus("idle");
  }, []);

  // Auto-start se configurado
  useEffect(() => {
    if (options.autoStart) {
      startScan();
    }

    return () => {
      stopScan();
    };
  }, []);

  // Verifica suporte na montagem
  useEffect(() => {
    checkSupport();
  }, [checkSupport]);

  return {
    // Estado
    status,
    data,
    error,
    isSupported,
    hasPermission,

    // Informações úteis
    serialNumber: data?.serialNumber || null,
    records: data?.records || [],

    // Ações
    startScan,
    stopScan,
    write,
    clear,
    checkSupport,
    requestPermission
  };
}
