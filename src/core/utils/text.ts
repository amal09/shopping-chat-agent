export function normalize(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function includesAny(haystack: string, needles: string[]): boolean {
  const h = normalize(haystack);
  return needles.some((n) => h.includes(normalize(n)));
}
