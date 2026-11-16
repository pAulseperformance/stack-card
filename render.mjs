#!/usr/bin/env node
// Draw a stack card from a JSON record: one SVG, no dependencies, no network.
//
// A date is the only thing a row must carry. The band is derived from it here, so a stale config is
// visible as an old date rather than a claim that cannot be checked.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const INK = "#d8f3dd";
const MUTED = "#7f9b88";
const BG = "#0b0f0c";
const ACCENT = "#45e08a";
const LINE = "#26332b";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const W = 460;
const COL_W = 196;
const COL_GAP = 20;
const ROW_H = 21;
const PAD = 20;
const HEAD_H = 56;
const PER_ROW = 2;

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function utcMidnight(iso) {
  return Date.parse(iso.slice(0, 10) + "T00:00:00Z");
}

/** Whole days between two calendar dates, and the band those days earn. */
export function bandFor(lastUsed, today = new Date()) {
  if (lastUsed === "never") return { band: "dormant", age: "never used" };
  if (!lastUsed) return { band: "none", age: "no date" };
  const day = utcMidnight(lastUsed);
  if (Number.isNaN(day)) return { band: "none", age: "no date" };
  const todayMs = Date.parse(today.toISOString().slice(0, 10) + "T00:00:00Z");
  const days = Math.max(0, Math.round((todayMs - day) / 86400000));
  const age = days === 0 ? "today" : days === 1 ? "1d ago" : `${days}d ago`;
  const band = days <= 3 ? "hot" : days <= 31 ? "warm" : "cool";
  return { band, age };
}

function dotColor(band) {
  if (band === "hot") return ACCENT;
  if (band === "warm") return INK;
  return MUTED;
}

export function render(config, today = new Date()) {
  const groups = Array.isArray(config.groups) ? config.groups : [];
  const title = config.title || "THE STACK";
  const rows = [];
  for (let i = 0; i < groups.length; i += PER_ROW) rows.push(groups.slice(i, i + PER_ROW));

  let y = HEAD_H;
  let body = "";
  rows.forEach((row, rowIndex) => {
    const tallest = Math.max(...row.map((g) => (g.services || []).length), 1);
    if (rowIndex) body += `<path d="M${PAD} ${y - 8}H${W - PAD}" stroke="${LINE}"/>`;
    row.forEach((group, col) => {
      const x = PAD + col * (COL_W + COL_GAP);
      body += `<text x="${x}" y="${y + 4}" fill="${MUTED}" font-size="9" letter-spacing="1.5">${esc((group.title || "").toUpperCase())}</text>`;
      (group.services || []).forEach((svc, j) => {
        const { band, age } = bandFor(svc.last_used, today);
        const cy = y + 22 + j * ROW_H;
        const quiet = band === "none" || band === "dormant";
        body += `<circle cx="${x + 3.5}" cy="${cy - 3.5}" r="3" fill="${dotColor(band)}" opacity="${quiet ? 0.4 : 1}"/>`;
        body += `<text x="${x + 14}" y="${cy}" fill="${quiet ? MUTED : INK}" font-size="11">${esc(svc.name)}</text>`;
        body += `<text x="${x + COL_W - 4}" y="${cy}" text-anchor="end" fill="${MUTED}" font-size="9">${esc(age)}</text>`;
      });
    });
    y += 22 + tallest * ROW_H + 16;
  });

  const H = Math.round(y + 6);
  const all = groups.flatMap((g) => g.services || []);
  const dated = all.filter((s) => {
    const { band } = bandFor(s.last_used, today);
    return band !== "none" && band !== "dormant";
  }).length;
  const head =
    `<rect width="${W}" height="${H}" rx="10" fill="${BG}"/>` +
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="none" stroke="${LINE}"/>` +
    `<text x="${PAD}" y="27" fill="${INK}" font-size="12" letter-spacing="2.4">${esc(title)}</text>` +
    `<circle cx="${PAD + 96}" cy="23" r="3" fill="${ACCENT}"/>` +
    `<text x="${W - PAD}" y="27" text-anchor="end" fill="${MUTED}" font-size="9">${dated} of ${all.length} with a date</text>` +
    `<path d="M${PAD} 40H${W - PAD}" stroke="${LINE}"/>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">` +
    `<style>text{font-family:${MONO}}</style>${head}${body}</svg>`
  );
}

const [, , configPath, outPath] = process.argv;
if (configPath && outPath && import.meta.url === `file://${process.argv[1]}`) {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const svg = render(config);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, svg, "utf8");
  const rows = (config.groups || []).flatMap((g) => g.services || []).length;
  console.log(`stack card: ${rows} services -> ${outPath} (${svg.length} bytes)`);
}
