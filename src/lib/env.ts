function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue = ""): string {
  return process.env[name] ?? defaultValue;
}

export const env = {
  databaseUrl: requireEnv("DATABASE_URL"),
  nextauthUrl: requireEnv("NEXTAUTH_URL"),
  nextauthSecret: requireEnv("NEXTAUTH_SECRET"),
  encryptionKey: requireEnv("ENCRYPTION_KEY"),
  smtpHost: optionalEnv("SMTP_HOST"),
  smtpPort: parseInt(optionalEnv("SMTP_PORT", "587")),
  smtpUser: optionalEnv("SMTP_USER"),
  smtpPass: optionalEnv("SMTP_PASS"),
  smtpFrom: optionalEnv("SMTP_FROM", "noreply@skiptracepro.com"),
  lexisnexisApiKey: optionalEnv("LEXISNEXIS_API_KEY"),
  transunionClientId: optionalEnv("TRANSUNION_CLIENT_ID"),
  transunionClientSecret: optionalEnv("TRANSUNION_CLIENT_SECRET"),
  experianApiKey: optionalEnv("EXPERIAN_API_KEY"),
  uspsNcoaUsername: optionalEnv("USPS_NCOA_USERNAME"),
  uspsNcoaPassword: optionalEnv("USPS_NCOA_PASSWORD"),
};
