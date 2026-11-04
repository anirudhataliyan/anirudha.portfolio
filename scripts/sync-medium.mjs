// Pulls your latest Medium posts (RSS) into content/medium.json.
// Never fails the build: on any error it keeps the existing file.
import { readFileSync, writeFileSync } from "node:fs";

const USER = process.env.MEDIUM_USER || "@anirudhataliyan";
const OUT = new URL("../content/medium.json", import.meta.url);
const MAX_DESC = 160;

const decode = (s) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'");
const text = (html) =>
  decode(html).replace(/<figure[\s\S]*?<\/figure>/g, "").replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ").trim();
const tag = (block, name) =>
  (block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)) || [])[1] || "";

export const parseFeed = (xml) =>
  [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, b]) => {
    const body = text(tag(b, "content:encoded") || tag(b, "description"));
    const cut = body.length > MAX_DESC ? body.slice(0, MAX_DESC).replace(/\s+\S*$/, "") + "…" : body;
    return {
      title: text(tag(b, "title")),
      link: text(tag(b, "link")).split("?")[0],
      date: new Date(text(tag(b, "pubDate"))).toISOString(),
      description: cut,
    };
  });

if (import.meta.main ?? process.argv[1] === new URL(import.meta.url).pathname) {
  try {
    const res = await fetch(`https://medium.com/feed/${USER}`, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = parseFeed(await res.text());
    if (items.length === 0) throw new Error("no items in feed");
    writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), items }, null, 2) + "\n");
    console.log(`medium: synced ${items.length} posts`);
  } catch (e) {
    console.warn(`medium: sync skipped (${e.message}); keeping ${JSON.parse(readFileSync(OUT, "utf8")).items.length} existing posts`);
  }
}
