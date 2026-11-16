import test from "node:test";
import assert from "node:assert/strict";
import { bandFor, render } from "../render.mjs";

const today = new Date("2026-11-17T12:00:00Z");

test("bands come from whole calendar days", () => {
  assert.equal(bandFor("2026-11-17", today).band, "hot");
  assert.equal(bandFor("2026-11-17", today).age, "today");
  assert.equal(bandFor("2026-11-16", today).age, "1d ago");
  assert.equal(bandFor("2026-11-14", today).band, "hot");   // 3 days
  assert.equal(bandFor("2026-11-13", today).band, "warm");  // 4 days
  assert.equal(bandFor("2026-10-17", today).band, "warm");  // 31 days
  assert.equal(bandFor("2026-10-16", today).band, "cool");  // 32 days
});

test("a missing or unreadable date is never a hot chip", () => {
  assert.equal(bandFor(null, today).band, "none");
  assert.equal(bandFor("", today).band, "none");
  assert.equal(bandFor("last tuesday", today).band, "none");
  assert.equal(bandFor(null, today).age, "no date");
});

test("never used is its own state, not a missing date", () => {
  const out = bandFor("never", today);
  assert.equal(out.band, "dormant");
  assert.equal(out.age, "never used");
});

test("the card draws every service once, and counts the dated ones", () => {
  const svg = render(
    {
      groups: [
        { title: "A", services: [{ name: "Alpha", last_used: "2026-11-17" }, { name: "Beta", last_used: null }] },
        { title: "B", services: [{ name: "Gamma", last_used: "never" }] },
      ],
    },
    today
  );
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /<\/svg>$/);
  for (const name of ["Alpha", "Beta", "Gamma"]) assert.ok(svg.includes(`>${name}</text>`), name);
  assert.ok(svg.includes("1 of 3 with a date"));
  assert.equal(svg.match(/Alpha<\/text>/g).length, 1);
});

test("names are escaped, so a service cannot break the document", () => {
  const svg = render({ groups: [{ title: "X & Y", services: [{ name: "A&B <tag>", last_used: "2026-11-17" }] }] }, today);
  assert.ok(svg.includes("A&amp;B &lt;tag&gt;"));
  assert.ok(!svg.includes("<tag>"));
});

test("an empty record still draws a valid, empty card", () => {
  const svg = render({ groups: [] }, today);
  assert.match(svg, /^<svg/);
  assert.ok(svg.includes("0 of 0 with a date"));
});

test("the height grows with the tallest column in each band of groups", () => {
  const one = render({ groups: [{ title: "A", services: [{ name: "a", last_used: "2026-11-17" }] }] }, today);
  const two = render(
    { groups: [{ title: "A", services: Array.from({ length: 6 }, (_, i) => ({ name: "s" + i, last_used: "2026-11-17" })) }] },
    today
  );
  const h = (svg) => Number(/height="(\d+)"/.exec(svg)[1]);
  assert.ok(h(two) > h(one));
});
