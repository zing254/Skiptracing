import { SkipTraceProvider, ProviderResult, SearchInput } from "./types";

export class TransUnionProvider implements SkipTraceProvider {
  name = "TransUnion TLO";
  priority = 25;

  async search(input: SearchInput): Promise<ProviderResult> {
    const clientId = process.env.TRANSUNION_CLIENT_ID;
    const clientSecret = process.env.TRANSUNION_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return { provider: this.name, found: false, confidence: 0, data: {} };
    }
    try {
      const tokenRes = await fetch("https://api.tlo.com/v1/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }),
      });
      const { access_token } = await tokenRes.json();

      const res = await fetch("https://api.tlo.com/v1/people/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${access_token}` },
        body: JSON.stringify({ firstName: input.firstName, lastName: input.lastName, ssnLast4: input.ssnLast4 }),
      });
      if (!res.ok) throw new Error(`TLO error: ${res.status}`);
      const data = await res.json();
      const confidence = data.matchScore ?? 0;
      return {
        provider: this.name,
        found: confidence >= 0.3,
        confidence,
        data: {
          addresses: data.addresses?.map((a: { fullAddress: string }) => a.fullAddress),
          phones: data.phones?.map((p: { phoneNumber: string }) => p.phoneNumber),
        },
      };
    } catch {
      return { provider: this.name, found: false, confidence: 0, data: {} };
    }
  }
}
