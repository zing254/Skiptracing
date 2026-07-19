import { env } from "../env";
import { logger } from "../logger";
import nodemailer from "nodemailer";

type AlertPayload = {
  to: string;
  subject: string;
  text: string;
};

const transporter = env.smtpHost
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    })
  : null;

export async function sendAlert(payload: AlertPayload): Promise<void> {
  if (!transporter) {
    logger.warn("SMTP not configured, skipping email alert", { subject: payload.subject });
    return;
  }

  try {
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
  await sendAlert({ to: env.complianceAlertEmail ?? "compliance@skiptracepro.com", subject, text });
}
