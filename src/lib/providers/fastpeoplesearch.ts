import * as cheerio from "cheerio";
import { SkipTraceProvider, ProviderResult, SearchInput } from "./types";

const BASE_URL = "https://www.fastpeoplesearch.com";

const HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function buildSearchUrl(input: SearchInput): string {
  const name = `${input.firstName}-${input.lastName}`.toLowerCase();
  return `${BASE_URL}/name/${name}`;
}

function clean(text: string | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

export class FastPeopleSearchProvider implements SkipTraceProvider {
  name = "FastPeopleSearch";
  priority = 5;

  async search(input: SearchInput): Promise<ProviderResult> {
    try {
      const url = buildSearchUrl(input);
      const res = await fetch(url, { headers: HEADERS, redirect: "follow" });
      if (!res.ok) {
        return { provider: this.name, found: false, confidence: 0, data: {} };
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      const addresses: string[] = [];
      const phones: string[] = [];
      const emails: string[] = [];
      const relatives: string[] = [];

      // Address cards
      $('[class*="address"]').each((_, el) => {
        const text = clean($(el).text());
        if (text && text.length > 5 && /\d/.test(text)) {
          addresses.push(text);
        }
      });

      // Phone numbers
      $('[class*="phone"], [class*="Phone"]').each((_, el) => {
        const text = clean($(el).text());
        if (/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)) {
          phones.push(text);
        }
      });

      // Emails
      $('[class*="email"], [class*="Email"]').each((_, el) => {
        const text = clean($(el).text());
        if (text.includes("@") && text.includes(".")) {
          emails.push(text);
        }
      });

      // Relatives / associates
      $('[class*="relative"], [class*="Relative"], [class*="associate"]').each(
        (_, el) => {
          const text = clean($(el).text());
          if (text && text.length > 2) {
            relatives.push(text);
          }
        }
      );

      // Age / DOB
      let dob: string | undefined;
      $('[class*="age"], [class*="Age"], [class*="birth"]').each((_, el) => {
        const text = clean($(el).text());
        if (/\d{1,2}\s*(years?|yrs?)/.test(text) || /\d{4}/.test(text)) {
          dob = text;
        }
      });

      const hasData =
        addresses.length > 0 || phones.length > 0 || emails.length > 0;
      const dataPoints =
        addresses.length + phones.length + emails.length + relatives.length;
      const confidence = hasData
        ? Math.min(0.5 + dataPoints * 0.1, 0.95)
        : 0;

      return {
        provider: this.name,
        found: hasData,
        confidence,
        data: {
          addresses: addresses.length > 0 ? addresses : undefined,
          phones: phones.length > 0 ? phones : undefined,
          emails: emails.length > 0 ? emails : undefined,
          dob,
        },
      };
    } catch {
      return { provider: this.name, found: false, confidence: 0, data: {} };
    }
  }
}
