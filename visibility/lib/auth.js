// Team sign-in: scrypt password hashes, HMAC-signed session cookie, lockout after repeated failures.
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { q, one } from "./db.js";

const COOKIE = "vis_session";
const SESSION_DAYS = 14;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) throw new Error("SESSION_SECRET is not set");
    return "dev-only-secret";
  }
  return s;
}

export function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}
export function checkPassword(pw, stored) {
  const [alg, salt, key] = String(stored).split("$");
  if (alg !== "scrypt" || !salt || !key) return false;
  const want = Buffer.from(key, "base64");
  const got = scryptSync(pw, Buffer.from(salt, "base64"), want.length);
  return timingSafeEqual(want, got);
}

const b64 = (s) => Buffer.from(s).toString("base64url");
const sign = (v) => createHmac("sha256", secret()).update(v).digest("base64url");

export function sessionCookie(userId, secure) {
  const payload = b64(JSON.stringify({ uid: userId, exp: Date.now() + SESSION_DAYS * 864e5 }));
  const v = `${payload}.${sign(payload)}`;
  return `${COOKIE}=${v}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? "; Secure" : ""}`;
}
export function clearCookie(secure) {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

function readCookie(req) {
  const raw = req.headers.cookie || "";
  const m = raw.split(/;\s*/).find((c) => c.startsWith(COOKIE + "="));
  return m ? m.slice(COOKIE.length + 1) : "";
}

export async function currentUser(req) {
  const v = readCookie(req);
  if (!v) return null;
  const [payload, sig] = v.split(".");
  if (!payload || !sig) return null;
  const want = Buffer.from(sign(payload));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  let data;
  try { data = JSON.parse(Buffer.from(payload, "base64url").toString()); } catch { return null; }
  if (!data.exp || data.exp < Date.now()) return null;
  return one("SELECT id,email,name,role FROM users WHERE id=$1", [data.uid]);
}

// First sign-in bootstraps the admin from ADMIN_EMAIL / ADMIN_PASSWORD when no users exist yet.
export async function login(email, password) {
  email = String(email || "").trim().toLowerCase();
  password = String(password || "");
  if (!email || !password) return { error: "Enter your email and password." };

  const count = (await one("SELECT count(*)::int AS n FROM users")).n;
  if (count === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD
      && email === process.env.ADMIN_EMAIL.toLowerCase() && password === process.env.ADMIN_PASSWORD) {
    const u = await one("INSERT INTO users (email,name,role,pass_hash) VALUES ($1,$2,'admin',$3) RETURNING id,email,name,role",
      [email, process.env.ADMIN_NAME || "Admin", hashPassword(password)]);
    return { user: u };
  }

  const u = await one("SELECT * FROM users WHERE email=$1", [email]);
  if (!u) { checkPassword(password, hashPassword("x")); return { error: "That email and password don't match." }; }
  if (u.locked_until && new Date(u.locked_until) > new Date()) {
    return { error: "Too many attempts. Try again in 15 minutes." };
  }
  if (!checkPassword(password, u.pass_hash)) {
    const fails = u.failed_logins + 1;
    await q("UPDATE users SET failed_logins=$2, locked_until=$3 WHERE id=$1",
      [u.id, fails >= 5 ? 0 : fails, fails >= 5 ? new Date(Date.now() + 15 * 60e3).toISOString() : null]);
    return { error: "That email and password don't match." };
  }
  await q("UPDATE users SET failed_logins=0, locked_until=NULL WHERE id=$1", [u.id]);
  return { user: { id: u.id, email: u.email, name: u.name, role: u.role } };
}

export const canEdit = (u) => u && (u.role === "admin" || u.role === "editor");
export const isAdmin = (u) => u && u.role === "admin";
