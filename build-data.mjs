// Fetches the Google Sheet and writes data.json. Run by GitHub Actions.
// The sheet ID comes from the SHEET_ID repository secret, so it never appears in the repo.
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { parseCSV, buildEvents } from "./merge.mjs";

const id = process.env.SHEET_ID;
const gid = process.env.SHEET_GID || "0";
if (!id) { console.error("SHEET_ID secret is not set."); process.exit(1); }

const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;
const res = await fetch(url, { redirect: "follow" });
if (!res.ok) { console.error(`Sheet request failed: HTTP ${res.status}. Check the sheet is shared as "Anyone with the link: Viewer".`); process.exit(1); }
const text = await res.text();
if (text.trim().startsWith("<")) { console.error("Got a web page instead of CSV. The sheet is probably not shared by link."); process.exit(1); }

const events = buildEvents(parseCSV(text));
if (events.length < 10) { console.error(`Only ${events.length} events parsed; refusing to overwrite data.json.`); process.exit(1); }

const body = JSON.stringify(events);
if (existsSync("data.json")) {
  try { if (JSON.stringify(JSON.parse(readFileSync("data.json", "utf8")).events) === body) { console.log("No changes."); process.exit(0); } } catch {}
}
writeFileSync("data.json", JSON.stringify({ updated: new Date().toISOString(), events }));
console.log(`Wrote ${events.length} events.`);
