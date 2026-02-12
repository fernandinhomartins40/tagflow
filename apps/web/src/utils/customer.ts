/**
 * Normaliza CPF removendo caracteres não numéricos
 */
export function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

/**
 * Normaliza telefone removendo caracteres não numéricos
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Mascara CPF para exibição
 */
export function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Mascara telefone para exibição
 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Mascara data para exibição
 */
export function maskDate(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Oculta parcialmente CPF para LGPD
 * Exemplo: 123.456.789-10 -> ***.456.789-**
 */
export function maskCpfPrivacy(cpf: string): string {
  const masked = maskCpf(cpf);
  if (masked.length < 14) return masked;
  return `***.${masked.slice(4, 11)}-**`;
}

/**
 * Oculta parcialmente telefone para LGPD
 * Exemplo: (11) 98765-4321 -> (11) 98***-**21
 */
export function maskPhonePrivacy(phone: string): string {
  const masked = maskPhone(phone);
  if (masked.length < 10) return masked;

  // (11) 98765-4321 ou (11) 8765-4321
  const parts = masked.match(/\((\d{2})\)\s(\d+)-(\d+)/);
  if (!parts) return masked;

  const [, ddd, firstPart, lastPart] = parts;
  const hiddenFirst = "*".repeat(Math.max(0, firstPart.length - 2));
  const hiddenLast = "*".repeat(Math.max(0, lastPart.length - 2));

  return `(${ddd}) ${firstPart.slice(0, 2)}${hiddenFirst}-${hiddenLast}${lastPart.slice(-2)}`;
}

/**
 * Valida CPF
 */
export function isValidCpf(cpfValue: string): boolean {
  const digits = cpfValue.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  return digit === parseInt(digits[10]);
}
