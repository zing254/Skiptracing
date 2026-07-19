import { SkipTraceProvider, ProviderResult, SearchInput } from "./types";

export class WaterfallEngine {
  private providers: SkipTraceProvider[];

  constructor(providers: SkipTraceProvider[]) {
    this.providers = [...providers].sort((a, b) => a.priority - b.priority);
  }

  async execute(input: SearchInput): Promise<{
    results: ProviderResult[];
    finalScore: number;
    sourcesQueried: string[];
  }> {
    const results: ProviderResult[] = [];
    const sourcesQueried: string[] = [];

    for (const provider of this.providers) {
      try {
        const result = await provider.search(input);
        results.push(result);
        sourcesQueried.push(provider.name);

        // Stop at high confidence
        if (result.confidence >= 0.8) break;
      } catch {
        sourcesQueried.push(`${provider.name} (error)`);
      }
    }

    const finalScore = this.calculateFinalScore(results);
    return { results, finalScore, sourcesQueried };
  }

  private calculateFinalScore(results: ProviderResult[]): number {
    const found = results.filter((r) => r.found);
    if (found.length === 0) return 0;
    const maxConf = Math.max(...found.map((r) => r.confidence));
    const crossBoost = found.length > 1 ? 0.1 : 0;
    return Math.min(1, parseFloat((maxConf + crossBoost).toFixed(2)));
  }
}
