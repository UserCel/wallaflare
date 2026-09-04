export interface SiteRule {
  domain: string | RegExp;
  cleanDom?: (doc: any) => void;
  cleanText?: (text: string) => string;
}

export const SITE_RULES: SiteRule[] = [
  {
    domain: /royalroadl?\.com/i,
    cleanDom: (doc) => {
      // 1. Remove author note promos if needed
      doc.querySelectorAll('.follow-author-form, form.follow-author, .follow-btn').forEach((el: any) => el.remove());

      // 2. Anti-theft watermark text cleaner (catches all dynamic variants)
      const antiTheftPhrases = [
        /this story originates from royal road/i,
        /ensure the author gets the support they deserve/i,
        /this chapter is illegally taken from royal road/i,
        /unauthorized reproduction: this story has been taken from royal road/i,
        /if you encounter this story on amazon.*taken without permission/i,
        /if you find this story on amazon.*stolen/i,
        /content taken without permission/i,
        /stolen from royal road/i,
        /taken without authorization from royal road/i,
      ];

      doc.querySelectorAll('p, div, span').forEach((el: any) => {
        const text = el.textContent?.trim() || '';
        if (text.length > 0 && text.length < 350) {
          if (antiTheftPhrases.some(regex => regex.test(text))) {
            el.remove();
          }
        }
      });
    },
  },
  {
    domain: /scribblehub\.com/i,
    cleanDom: (doc) => {
      const antiTheftPhrases = [
        /this story is taken from scribble hub/i,
        /this chapter was stolen from scribble hub/i,
        /unauthorized reproduction: this story has been taken from scribble hub/i,
      ];
      doc.querySelectorAll('p, div, span').forEach((el: any) => {
        const text = el.textContent?.trim() || '';
        if (text.length > 0 && text.length < 350) {
          if (antiTheftPhrases.some(regex => regex.test(text))) {
            el.remove();
          }
        }
      });
    },
  },
];

export function applySiteSpecificRules(doc: any, domain: string): void {
  if (!doc || !domain) return;
  for (const rule of SITE_RULES) {
    const matches = typeof rule.domain === 'string'
      ? domain.toLowerCase().includes(rule.domain.toLowerCase())
      : rule.domain.test(domain);
    if (matches && rule.cleanDom) {
      try {
        rule.cleanDom(doc);
      } catch {}
    }
  }
}
