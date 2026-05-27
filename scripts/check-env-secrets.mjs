#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";

const allowedEnvFiles = new Set([".env.example"]);
const blockedEnvFilePatterns = [
  /^\.env$/,
  /^\.env\.(local|development|production|test)$/,
  /^\.env\.(development|production|test)\.local$/,
];

const secretPatterns = [
  {
    name: "Google API key",
    pattern: /AIza[0-9A-Za-z_-]{20,}/,
  },
  {
    name: "Supabase publishable or anon key",
    pattern: /sb_(?:publishable|anon)__[0-9A-Za-z_-]{20,}/,
  },
  {
    name: "OpenAI-style secret key",
    pattern: /sk-[A-Za-z0-9_-]{20,}/,
  },
  {
    name: "JWT-looking token",
    pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
  },
];

const placeholderValues = new Set([
  "",
  "your_supabase_publishable_key",
  "your_gemini_api_key",
  "your_usda_key_here",
  "your_email@example.com",
  "http://localhost:3000",
  "https://your-project-ref.supabase.co",
  "gemini-2.5-flash",
]);

const skippedDirectories = new Set([".git", ".next", ".vercel", "coverage", "node_modules", "out"]);

function gitTrackedFiles() {
  try {
    const output = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return output.split("\0").filter(Boolean);
  } catch {
    return filesystemFiles(".");
  }
}

function filesystemFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    if (skippedDirectories.has(entry)) continue;
    const path = directory === "." ? entry : `${directory}/${entry}`;
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...filesystemFiles(path));
    } else if (stat.isFile()) {
      files.push(path);
    }
  }
  return files;
}

function isBlockedEnvFile(file) {
  if (allowedEnvFiles.has(file)) return false;
  return blockedEnvFilePatterns.some((pattern) => pattern.test(file));
}

function isBinary(buffer) {
  return buffer.includes(0);
}

function checkExampleValue(file, line, lineNumber, failures) {
  if (!file.endsWith(".env.example")) return;
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return;

  const [key, ...rest] = trimmed.split("=");
  const value = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
  if (key.startsWith("NEXT_PUBLIC_") && value.startsWith("https://") && value.includes("supabase.co") && !placeholderValues.has(value)) {
    failures.push(`${file}:${lineNumber} contains a real-looking ${key}. Keep examples as placeholders.`);
    return;
  }

  if (!placeholderValues.has(value) && /(KEY|SECRET|TOKEN|URL|EMAIL)$/i.test(key)) {
    failures.push(`${file}:${lineNumber} contains a non-placeholder value for ${key}.`);
  }
}

const failures = [];
const files = gitTrackedFiles();

for (const file of files) {
  if (isBlockedEnvFile(file)) {
    failures.push(`${file} is tracked. Keep real environment files local or in your deployment provider.`);
    continue;
  }

  let buffer;
  try {
    buffer = readFileSync(file);
  } catch {
    continue;
  }

  if (isBinary(buffer)) continue;
  const text = buffer.toString("utf8");
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    checkExampleValue(file, line, index + 1, failures);
    for (const secret of secretPatterns) {
      if (secret.pattern.test(line)) {
        failures.push(`${file}:${index + 1} contains a real-looking ${secret.name}.`);
      }
    }
  });
}

if (failures.length > 0) {
  console.error("Secret guard failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error("\nUse .env.local locally and provider environment variables in production. Never commit real keys.");
  process.exit(1);
}

console.log("Secret guard passed.");
