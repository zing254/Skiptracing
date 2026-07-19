import { env } from "../env";
import { logger } from "../logger";

type AlertPayload = {
  to: string;
  subject: string;
  text: string;
};

export async function sendAlert(payload: AlertPayload): Promise<void> {
  if (!env.smtpHost) {
    logger.warn("SMTP not configured, skipping email alert", { subject: payload.subject });
    return;
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    });

    await transporter.sendMail({
      from: env.smtpFrom,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
    });

    logger.info("Alert email sent", { to: payload.to, subject: payload.subject });
  } catch (err) {
    logger.error("Failed to send alert email", { error: String(err) });
  }
}

export async function sendComplianceAlert(flagType: string, debtorName: string, accountNumber: string): Promise<void> {
  const subject = `[COMPLIANCE] ${flagType.toUpperCase()} Flag — ${debtorName}`;
  const text = `A compliance flag has been triggered:\n\nType: ${flagType}\nDebtor: ${debtorName}\nAccount: ${accountNumber}\n\nPlease review and take appropriate action.`;
  await sendAlert({ to: "compliance@skiptracepro.com", subject, text });
}
