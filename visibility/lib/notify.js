// Alerts go to Slack (incoming webhook) and/or email (Resend). Every attempt is logged.
import { q, getSetting } from "./db.js";

const ICON = { critical: "🔴", warn: "🟠", good: "🟢", info: "🔵" };

export async function notify({ subject, text, severity = "info" }) {
  const results = [];
  const appUrl = (process.env.APP_URL || "").replace(/\/+$/, "");
  const footer = appUrl ? `\n\nOpen Premier Visibility: ${appUrl}` : "";

  const slack = process.env.SLACK_WEBHOOK_URL;
  if (slack) {
    results.push(await send("slack", subject, text, async () => {
      const r = await fetch(slack, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: `${ICON[severity] || ""} *${subject}*\n${text}${footer}` }),
      });
      if (!r.ok) throw new Error(`Slack returned ${r.status}`);
    }));
  }

  const key = process.env.RESEND_API_KEY;
  const to = (await getSetting("alert_emails", null)) || splitList(process.env.ALERT_EMAILS);
  if (key && to && to.length) {
    results.push(await send("email", subject, text, async () => {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: process.env.ALERT_FROM || "Premier Visibility <alerts@premierfamilybusiness.com>",
          to, subject: `[Premier Visibility] ${subject}`, text: text + footer,
        }),
      });
      if (!r.ok) throw new Error(`Resend returned ${r.status}: ${(await r.text()).slice(0, 200)}`);
    }));
  }

  if (!results.length) {
    await q("INSERT INTO notifications (channel,subject,body,ok,error) VALUES ('none',$1,$2,false,$3)",
      [subject, text, "No channel configured. Set SLACK_WEBHOOK_URL or RESEND_API_KEY + alert emails."]);
  }
  return results;
}

async function send(channel, subject, body, fn) {
  try {
    await fn();
    await q("INSERT INTO notifications (channel,subject,body,ok) VALUES ($1,$2,$3,true)", [channel, subject, body]);
    return { channel, ok: true };
  } catch (e) {
    await q("INSERT INTO notifications (channel,subject,body,ok,error) VALUES ($1,$2,$3,false,$4)", [channel, subject, body, String(e.message || e)]);
    return { channel, ok: false, error: String(e.message || e) };
  }
}

export function splitList(s) {
  return String(s || "").split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);
}
