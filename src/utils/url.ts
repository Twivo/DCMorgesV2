// Neutralises dangerous URL schemes before a user-provided value is rendered as
// a link href on a public page. Relative paths and http/https/mailto/tel are
// kept as-is; javascript:, data:, vbscript: (and other odd schemes) become "#".
export const safeUrl = (value?: string): string | undefined => {
  if (!value) return value;
  const trimmed = value.trim();
  const scheme = trimmed.match(/^([a-z][a-z0-9+.-]*):/i);
  if (!scheme) return trimmed; // relative URL, anchor or query — safe
  return /^(https?|mailto|tel):$/i.test(scheme[1] + ":") ? trimmed : "#";
};
