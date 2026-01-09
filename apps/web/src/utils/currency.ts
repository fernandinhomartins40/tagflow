export const formatCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const number = Number(digits) / 100;
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const formatCurrencyValue = (value: number) => {
  if (Number.isNaN(value)) return "";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const parseCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
};
