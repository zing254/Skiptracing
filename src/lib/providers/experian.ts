import { SkipTraceProvider, ProviderResult, SearchInput } from "./types";

export class ExperianProvider implements SkipTraceProvider {
  name = "Experian Skip Trace";
  priority = 30;

  async search(input: SearchInput): Promise<ProviderResult> {
    const apiKey = process.env.EXPERIAN_API_KEY;
    if (!apiKey) {
      return { provider: this.name, found: false, confidence: 0, data: {} };
    }
    try {
      const res = await fetch("https://api.experian.com/skip-trace/v1/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ firstName: input.firstName, lastName: input.lastName, ssnLast4: input.ssnLast4, dob: input.dob }),
      });
      if (!res.ok) throw new Error(`Experian error: ${res.status}`);
      const data = await res.json();
      const confidence = data.confidenceScore ?? 0;
      return {
        provider: this.name,
        found: confidence >= 0.3,
        confidence,
        data: {
          addresses: data.addresses?.map((a: { line1: string; city: string; state: string; zip: string }) => `${a.line1}, ${a.city} ${a.state} ${a.zip}`),
          phones: data.phones?.map((p: { number: string; type: string }) => p.number),
        },
      };
    } catch {
      return { provider: this.name, found: false, confidence: 0, data: {} };
    }
  }
}
