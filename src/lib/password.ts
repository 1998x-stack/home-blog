import { scrypt as scryptCallback, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);

export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, Buffer.from(salt, "hex"), 64) as Buffer;
  return `scrypt:${salt}:${key.toString("hex")}`;
}
export async function passwordValid(password: string, saved: string) {
  const match = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(saved);
  if (!match) return false;
  const key = await scrypt(password, Buffer.from(match[1], "hex"), 64) as Buffer;
  return timingSafeEqual(key, Buffer.from(match[2], "hex"));
}
