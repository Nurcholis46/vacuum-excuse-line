// vacuum-excuse entrypoint
// Writes the single-line entry to /output/entry.txt after gate checks.
// Authored for Node 22 with native TypeScript stripping.

import { chmodSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const OUTPUT_PATH: string = "/output/entry.txt";
const TMP_PATH: string = "/output/.entry.txt.tmp";

// The submitted line. Must stay byte-identical to the required text.
const LINE: string = "I skipped it on purpose — the rug fringe started a union and my brush roll negotiated a ceasefire.";

function fail(message: string): never {
  console.error(`vacuum-excuse: ${message}`);
  process.exit(1);
}

function checkGate(value: string): void {
  // Code-point length, not UTF-16 units, so astral characters count once.
  const points: number = [...value].length;
  if (points < 1 || points > 120) {
    fail(`line length ${points} outside 1-120`);
  }
  if (value.trim().length === 0) {
    fail("line is blank");
  }
  if (value.includes("\n") || value.includes("\r")) {
    fail("line contains a newline or carriage return");
  }
  if (value !== value.trim()) {
    fail("line has leading or trailing whitespace");
  }
}

function main(): void {
  checkGate(LINE);

  const payload: Buffer = Buffer.from(LINE, "utf8");
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });

  // Atomic publish: write beside the target, fix mode, then rename over it.
  writeFileSync(TMP_PATH, payload);
  chmodSync(TMP_PATH, 0o644);
  renameSync(TMP_PATH, OUTPUT_PATH);
  chmodSync(OUTPUT_PATH, 0o644);

  // Read back and require an exact byte match before reporting success.
  const written: Buffer = readFileSync(OUTPUT_PATH);
  if (written.length !== payload.length) {
    fail(`read-back length ${written.length} != expected ${payload.length}`);
  }
  if (!written.equals(payload)) {
    fail("read-back mismatch: output differs from expected bytes");
  }
  const mode: number = statSync(OUTPUT_PATH).mode & 0o777;
  if (mode !== 0o644) {
    fail(`output mode ${mode.toString(8)} != 644`);
  }

  console.log(`wrote ${OUTPUT_PATH} (${payload.length} bytes)`);
}

main();
