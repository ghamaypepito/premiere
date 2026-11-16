// Alerts to Slack (incoming webhook) and/or email via Resend's free tier. Every attempt is logged.
import { run, iso, getSetting, splitList, j } from "./util.js";

export async function notify(env, { subject, text, severity = "info" }) {
  const icon = { critical: "🔴", warn: "🟠", good: "🟢", info: "🔵" }[severity] || "";
  const app = String(env.APP_URL || "").replace(/\/+$/, "");
  const footer = app ? `\n\nOpen Premier Visibility: ${app}` : "";
  const results = [];

  if (env.SLACK_WEBHOOK_URL) {
    results.push(await attempt(env, "slack", subject, text, async () => {
      const r = await fetch(env.SLACK_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: j({ text: `${icon} *${subject}*\n${text}${footer}` }) });
      if (!r.ok) throw new Error(`Slack returned ${r.status}`);
    }));
  }
  const to = (await getSetting(env, "alert_emails", null)) || splitList(env.ALERT_EMAILS);
  if (env.RESEND_API_KEY && to.length) {
    results.push(await attempt(env, "email", subject, text, async () => {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST", headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: j({ from: env.ALERT_FROM || "Premier Visibility <onboarding@resend.dev>", to, subject: `[Premier Visibility] ${subject}`, text: text + footer }),
      });
      if (!r.ok) throw new Error(`Resend returned ${r.status}: ${(await r.text()).slice(0, 200)}`);
    }));
  }
  if (!results.length) {
    await run(env, "INSERT INTO notifications (at,channel,subject,body,ok,error) VALUES (?,?,?,?,0,?)", iso(), "none", subject, text,
      "No alert channel configured yet. Add a Slack webhook or a Resend key (see Settings).");
  }
  return results;
}

async function attempt(env, channel, subject, body, fn) {
  let error = "";
  try { await fn(); } catch (e) { error = String(e.message || e); }
  await run(env, "INSERT INTO notifications (at,channel,subject,body,ok,error) VALUES (?,?,?,?,?,?)", iso(), channel, subject, body, error ? 0 : 1, error);
  return { channel, ok: !error, error };
}
