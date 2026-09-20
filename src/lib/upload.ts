import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { newId } from "./db";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

export async function saveImage(file: File): Promise<string | null> {
  if (!file || typeof file === "string" || file.size === 0) return null;
  if (!ALLOWED.has(file.type)) return null;
  if (file.size > 10 * 1024 * 1024) return null;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const name = `${newId("img_")}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_DIR, name), buffer);
  return `/uploads/${name}`;
}
