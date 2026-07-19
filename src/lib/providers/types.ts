export type ProviderResult = {
  provider: string;
  found: boolean;
  confidence: number;
  data: {
    addresses?: string[];
    phones?: string[];
    emails?: string[];
    deceased?: boolean;
    bankruptcy?: boolean;
    attorneyRepresented?: boolean;
    dob?: string;
    ssn?: string;
  };
};

export type SearchInput = {
  firstName: string;
  lastName: string;
  middleName?: string;
  ssnLast4?: string;
  dob?: string;
  address?: string;
  phone?: string;
};

export interface SkipTraceProvider {
  name: string;
  priority: number;
  search(input: SearchInput): Promise<ProviderResult>;
}
