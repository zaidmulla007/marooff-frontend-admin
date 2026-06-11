// Money helpers — AED stored as integer minor units (fils). 99.50 AED = 9950.

export function fromMinor(minor, currency = 'AED') {
  if (minor == null || minor === '') return '';
  const v = Number(minor) / 100;
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency, minimumFractionDigits: 2 }).format(v);
}

export function toMinor(input) {
  if (input == null || input === '') return 0;
  const v = typeof input === 'number' ? input : parseFloat(String(input).replace(/,/g, ''));
  return Number.isFinite(v) ? Math.round(v * 100) : 0;
}

export function minorToInputString(minor) {
  if (minor == null) return '';
  return (Number(minor) / 100).toFixed(2);
}
