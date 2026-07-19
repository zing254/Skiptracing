import { SkipTraceProvider, ProviderResult, SearchInput } from "./types";

export class LexisNexisProvider implements SkipTraceProvider {
  name = "LexisNexis Accurint";
  priority = 10;

  async search(input: SearchInput): Promise<ProviderResult> {
    const apiKey = process.env.LEXISNEXIS_API_KEY;
    if (!apiKey) {
      return { provider: this.name, found: false, confidence: 0, data: {} };
    }
    try {
      const res = await fetch("https://api.accurint.lexisnexis.com/v1/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          firstName: input.firstName,
          lastName: input.lastName,
          ssnLast4: input.ssnLast4,
          dob: input.dob,
        }),
      });
      if (!res.ok) throw new Error(`LexisNexis error: ${res.status}`);
      const data = await res.json();
      const confidence = data.confidence ?? 0;
      return {
        provider: this.name,
        found: confidence >= 0.3,
        confidence,
        data: {
          addresses: data.addresses?.map((a: { full: string }) => a.full),
          phones: data.phones?.map((p: { number: string }) => p.number),
          emails: data.emails?.map((e: { address: string }) => e.address),
        },
      };
    } catch {
      return { provider: this.name, found: false, confidence: 0, data: {} };
    }
  }
}
