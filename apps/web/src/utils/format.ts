/**
 * Utilitários de formatação e parsing
 */

/**
 * Remove todos os caracteres não numéricos
 */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Mascara CPF (XXX.XXX.XXX-XX)
 */
export function maskCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Mascara telefone ((XX) XXXXX-XXXX)
 */
export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Mascara data (DD/MM/AAAA)
 */
export function maskDate(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Converte data DD/MM/AAAA para ISO YYYY-MM-DD
 */
export function toIsoDate(value: string): string | null {
  const digits = onlyDigits(value);
  if (digits.length !== 8) return null;
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  // Validação básica
  const dayNum = parseInt(day);
  const monthNum = parseInt(month);
  if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) return null;

  return `${year}-${month}-${day}`;
}

/**
 * Formata data ISO para DD/MM/AAAA
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  if (value.includes("/")) return value;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

/**
 * Formata entrada de moeda (retorna string formatada)
 */
export function formatCurrencyInput(value: string): string {
  const digits = onlyDigits(value);
  if (!digits) return "";
  const number = Number(digits) / 100;
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Formata valor numérico para moeda
 */
export function formatCurrencyValue(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) || 0 : value || 0;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Faz parse de string formatada de moeda para number
 */
export function parseCurrencyInput(value: string): number {
  const digits = onlyDigits(value);
  if (!digits) return 0;
  return Number(digits) / 100;
}
