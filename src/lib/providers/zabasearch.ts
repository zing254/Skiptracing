import * as cheerio from "cheerio";
import { SkipTraceProvider, ProviderResult, SearchInput } from "./types";

const BASE_URL = "https://www.zabasearch.com";

const HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function buildSearchUrl(input: SearchInput): string {
  const name = `${input.firstName}-${input.lastName}`.toLowerCase();
  return `${BASE_URL}/people/${name}`;
}

function clean(text: string | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

export class ZabaSearchProvider implements SkipTraceProvider {
  name = "ZabaSearch";
  priority = 15;

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

      // Addresses
      $(
        '[class*="address"], [class*="Address"], [class*="residence"], [class*="Residence"]'
      ).each((_, el) => {
        const text = clean($(el).text());
        if (text && text.length > 5 && /\d/.test(text)) {
          addresses.push(text);
        }
      });

      // Look for city/state/zip patterns
      $(
        '[class*="location"], [class*="Location"], [class*="city"]'
      ).each((_, el) => {
        const text = clean($(el).text());
        if (text && /\d{5}/.test(text) && !addresses.includes(text)) {
          addresses.push(text);
        }
      });

      // Phones
      $('[class*="phone"], [class*="Phone"], [class*="telephone"]').each(
        (_, el) => {
          const text = clean($(el).text());
          if (/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)) {
            phones.push(text);
          }
        }
      );

      // Emails
      $('[class*="email"], [class*="Email"]').each((_, el) => {
        const text = clean($(el).text());
        if (text.includes("@") && text.includes(".")) {
          emails.push(text);
        }
      });

      // DOB / age
      let dob: string | undefined;
      $('[class*="age"], [class*="Age"], [class*="birth"], [class*="Birth"]').each(
        (_, el) => {
          const text = clean($(el).text());
          if (/\d{1,2}\s*(years?|yrs?)/.test(text) || /\d{4}/.test(text)) {
            dob = text;
          }
        }
      );

      const hasData =
        addresses.length > 0 || phones.length > 0 || emails.length > 0;
      const dataPoints =
        addresses.length + phones.length + emails.length;
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
