import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

export type CameraScanMode = "qr" | "barcode";

export function useCameraScanner(containerId: string, mode: CameraScanMode) {
  const [status, setStatus] = useState("idle");
  const [data, setData] = useState<string | null>(null);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const barcodeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const barcodeControlsRef = useRef<IScannerControls | null>(null);

  const start = useCallback(async () => {
    try {
      setStatus("iniciando");
      setData(null);
      if (mode === "qr") {
        const scanner = new Html5Qrcode(containerId);
        qrScannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            setData(decodedText);
            setStatus("lido");
            scanner.stop().catch(() => undefined);
          }
        );
      } else {
        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.AZTEC,
          BarcodeFormat.CODABAR,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.CODE_128,
          BarcodeFormat.DATA_MATRIX,
          BarcodeFormat.EAN_8,
          BarcodeFormat.EAN_13,
          BarcodeFormat.ITF,
          BarcodeFormat.PDF_417,
          BarcodeFormat.QR_CODE,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.UPC_EAN_EXTENSION
        ]);
        const reader = new BrowserMultiFormatReader(hints, 300);
        barcodeReaderRef.current = reader;
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          },
          containerId,
          (result) => {
            if (result) {
              setData(result.getText());
              setStatus("lido");
              controls.stop();
            }
          }
        );
        barcodeControlsRef.current = controls;
      }
      setStatus("lendo");
    } catch {
      setStatus("erro");
    }
  }, [containerId, mode]);

  const stop = useCallback(() => {
    try {
      if (mode === "qr") {
        const scanner = qrScannerRef.current;
        if (scanner?.isScanning) {
          scanner.stop().catch(() => undefined);
        }
      } else {
        barcodeControlsRef.current?.stop();
        barcodeReaderRef.current?.reset();
      }
    } catch {
      // noop
    }
    setStatus("parado");
  }, [mode]);

  useEffect(() => () => stop(), [stop]);

  return { data, status, start, stop };
}
