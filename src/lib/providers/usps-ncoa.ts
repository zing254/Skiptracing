import { SkipTraceProvider, ProviderResult, SearchInput } from "./types";

export class UspsNcoaProvider implements SkipTraceProvider {
  name = "USPS NCOA";
  priority = 40;

  async search(input: SearchInput): Promise<ProviderResult> {
    const username = process.env.USPS_NCOA_USERNAME;
    const password = process.env.USPS_NCOA_PASSWORD;
    if (!username || !password || !input.address) {
      return { provider: this.name, found: false, confidence: 0, data: {} };
    }
    try {
      const res = await fetch("https://secure.usps.com/ncoa/v1/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          firstName: input.firstName,
          lastName: input.lastName,
          address: input.address,
        }),
      });
      if (!res.ok) throw new Error(`USPS error: ${res.status}`);
      const data = await res.json();
      const found = data.newAddress !== undefined;
      return {
        provider: this.name,
        found,
        confidence: found ? 0.75 : 0,
        data: { addresses: data.newAddress ? [`${data.newAddress.line1}, ${data.newAddress.city} ${data.newAddress.state} ${data.newAddress.zip}`] : undefined },
      };
    } catch {
      return { provider: this.name, found: false, confidence: 0, data: {} };
    }
  }
}
