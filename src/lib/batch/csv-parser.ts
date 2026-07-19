import { csvRowSchema } from "../validation";
import type { z } from "zod";

export type CsvRow = z.infer<typeof csvRowSchema>;

export type ParseResult = {
  rows: CsvRow[];
  errors: Array<{ row: number; error: string }>;
};

export function parseBatchCsv(csvText: string): ParseResult {
  const Papa = require("papaparse");
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

  const rows: CsvRow[] = [];
  const errors: ParseResult["errors"] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const result = csvRowSchema.safeParse(parsed.data[i]);
    if (result.success) {
      rows.push(result.data);
    } else {
      errors.push({ row: i + 1, error: result.error.format()._errors.join("; ") });
    }
  }

  return { rows, errors };
}
