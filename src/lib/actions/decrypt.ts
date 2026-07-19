"use server";

import { decrypt } from "@/lib/crypto";

export async function decryptSsnAction(encryptedSsn: string): Promise<string> {
  try {
    return decrypt(encryptedSsn);
  } catch {
    return "DECRYPTION_FAILED";
  }
}
