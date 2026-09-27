// "Did you mean …@gmail.com?" for mistyped email domains. Runs entirely in
// the app: compares the domain with common providers and suggests the
// closest one when it's only a keystroke or two away.

const DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.in",
  "ymail.com",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.de",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "fastmail.com",
];

/** Edit distance where swapping two neighbouring letters ("gmial") counts as one mistake. */
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * The corrected email if the domain looks like a typo of a common provider
 * (e.g. "sam@gmial.com" → "sam@gmail.com"), otherwise null. Exact matches and
 * unfamiliar domains (like a company's own) are left alone.
 */
export function suggestEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain || DOMAINS.includes(domain)) return null;

  let best: { domain: string; d: number } | null = null;
  for (const candidate of DOMAINS) {
    const d = distance(domain, candidate);
    if (!best || d < best.d) best = { domain: candidate, d };
  }
  // One slip for short domains, two for longer ones; anything more is probably a real domain.
  const allowed = domain.length <= 6 ? 1 : 2;
  return best && best.d <= allowed ? `${local}@${best.domain}` : null;
}
