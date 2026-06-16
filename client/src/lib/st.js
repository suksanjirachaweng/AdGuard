// Parse a CSS declaration string ("color:#fff;font-size:13px") into a React
// style object. Lets us carry the design's inline styles into JSX verbatim.
export function st(str) {
  if (!str) return undefined;
  const o = {};
  for (const part of str.split(";")) {
    const i = part.indexOf(":");
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    const val = part.slice(i + 1).trim();
    if (!key) continue;
    const camel = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    o[camel] = val;
  }
  return o;
}
