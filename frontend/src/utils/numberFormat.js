export function toNumber(value) {
  const number = Number.parseFloat(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export function formatCurrency(value) {
  return `$${toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercentage(value) {
  return `${toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}
