import { SearchInput, ProviderResult } from "../providers/types";

export type FlagType = "bankruptcy" | "deceased" | "attorney_rep" | "do_not_contact" | "minor";
export type ComplianceFlag = { flagType: FlagType; notes: string; source: string };

export function detectFlags(input: SearchInput, results: ProviderResult[]): ComplianceFlag[] {
  const flags: ComplianceFlag[] = [];

  for (const result of results) {
    if (!result.found) continue;

    if (result.data.bankruptcy) {
      flags.push({ flagType: "bankruptcy", notes: "Bankruptcy indicator found in provider response", source: result.provider });
    }

    if (result.data.deceased) {
      flags.push({ flagType: "deceased", notes: "Deceased indicator found in provider response", source: result.provider });
    }

    if (result.data.attorneyRepresented) {
      flags.push({ flagType: "attorney_rep", notes: "Attorney representation flagged by provider", source: result.provider });
    }
  }

  if (input.dob) {
    const age = calculateAge(input.dob);
    if (age < 18) {
      flags.push({ flagType: "minor", notes: `Debtor age (${age}) indicates minor status`, source: "System" });
    }
  }

  return flags;
}

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
