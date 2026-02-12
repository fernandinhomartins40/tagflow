/**
 * Validação de CPF brasileiro com verificação de dígitos
 */
export function validateCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');

  // Deve ter 11 dígitos
  if (digits.length !== 11) return false;

  // Rejeita sequências conhecidas (111.111.111-11, etc)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // Validar primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(digits[9])) return false;

  // Validar segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(digits[10])) return false;

  return true;
}

/**
 * Normaliza campo opcional: string vazia vira undefined
 */
export function normalizeOptionalField(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Converte valor numérico do backend (string | number | null) para number
 */
export function parseNumericField(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'string' ? parseFloat(value) || 0 : value;
}

/**
 * Valida email
 */
export function validateEmail(email: string): boolean {
  if (!email.trim()) return true; // Email opcional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida telefone (mínimo 10 dígitos)
 */
export function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10;
}
