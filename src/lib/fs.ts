// Server-side filesystem helpers (Node runtime only).
import { rename, unlink, writeFile } from "node:fs/promises";

// Atomically write `data` as pretty-printed JSON: write to a temp file, then
// rename over the target so readers never observe a half-written file.
export async function writeJsonAtomic(file: string, data: unknown): Promise<void> {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
    await rename(tmp, file);
  } catch (error) {
    await unlink(tmp).catch(() => {});
    throw error;
  }
}
