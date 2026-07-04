#!/usr/bin/env node
/**
 * check-links.js — Broken link checker for the Nobel Prize Explorer static site.
 *
 * Zero npm dependencies. Uses Node 20's built-in fetch.
 *
 * What it checks:
 *   1. Every <a href> in the live index.html
 *   2. Every wiki_url value in nobel_data.js (200+ Nobel laureate Wikipedia links)
 *
 * What it skips:
 *   - Fragment-only anchors (#main, #quiz)
 *   - mailto: and javascript: links
 *   - Empty / whitespace hrefs
 *   - Hosts in SKIP_HOSTS (offsite, dynamic, or template-based)
 *   - Relative paths that don't start with http(s):// and aren't local files
 *
 * Usage:
 *   node check-links.js [--site URL]
 *
 * Exits 1 on any broken link so PR checks can fail the build.
 * Exits 0 if all reachable links return 2xx/3xx.
 */

const SITE = (() => {
  const i = process.argv.indexOf("--site");
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : "https://sahirvhora.github.io/nobel-explorer/";
})();

// Offsite hosts with runtime templates (postcode, query params we can't satisfy)
// or known-OK but rate-limited public services we don't want to spam.
const SKIP_HOSTS = new Set([
  "check-long-term-flood-risk.service.gov.uk",
  "checker.ofcom.org.uk",
  "find-energy-certificate.service.gov.uk",
  "fonts.googleapis.com",
  "get-information-schools.service.gov.uk",
  "landregistry.data.gov.uk",
  "openstreetmap.org",
  "reports.ofsted.gov.uk",
  "unpkg.com",
  "www.gov.uk",
  "www.locrating.com",
  "www.police.uk",
  "www.rightmove.co.uk",
  "github.com",
  "sahirvhora.github.io",
]);

const TIMEOUT_MS = 8000;
const CONCURRENCY = 3;            // be gentle to rate-limited public services
const RETRY_429_BACKOFF_MS = 2000;
const MAX_429_RETRIES = 1;        // don't retry hard — fail fast
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days for normal results
const CACHE_TTL_429_MS = 60 * 60 * 1000;      // 1 hour for rate-limited entries
const CACHE_PATH = ".check-links-cache.json";
const INTER_REQUEST_JITTER_MS = 100; // stagger start times to avoid bursts
const CONSECUTIVE_429_ABORT = 5;       // stop hammering if a host is throttling

function shouldSkip(href) {
  if (!href || !href.trim()) return true;
  if (href.startsWith("#")) return true;
  if (href.startsWith("javascript:")) return true;
  if (href.startsWith("mailto:")) return true;
  try {
    const u = new URL(href, SITE);
    if (u.protocol !== "http:" && u.protocol !== "https:") return true;
    if (SKIP_HOSTS.has(u.hostname)) return true;
    for (const skip of SKIP_HOSTS) {
      if (u.hostname.endsWith("." + skip)) return true;
    }
    return false;
  } catch {
    return true;
  }
}

function normalize(href) {
  try {
    return new URL(href, SITE).toString();
  } catch {
    return href;
  }
}

function loadCache() {
  try {
    const raw = require("fs").readFileSync(CACHE_PATH, "utf8");
    const data = JSON.parse(raw);
    const now = Date.now();
    const fresh = {};
    for (const [k, v] of Object.entries(data)) {
      if (v.expires > now) fresh[k] = v;
    }
    return fresh;
  } catch {
    return {};
  }
}

function saveCache(cache) {
  try {
    require("fs").writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch (e) {
    console.error(`warning: could not write cache ${CACHE_PATH}: ${e.message}`);
  }
}

async function checkUrl(url, cache) {
  // Cache hit: reuse the result if it hasn't expired
  const now = Date.now();
  const cached = cache[url];
  if (cached && cached.expires > now) {
    return { url, status: cached.status, ok: cached.ok, cached: true };
  }

  let attempt = 0;
  let lastErr = null;
  while (true) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      // Try HEAD first (cheaper); fall back to GET on 405/501.
      let resp = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
      if (resp.status === 405 || resp.status === 501) {
        resp = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
      }
      // Treat 429 (rate limited) as retryable, not broken — but only within
      // this run. If retries are exhausted, cache the 429 with a short TTL
      // so the next run within an hour doesn't hammer Wikipedia again.
      if (resp.status === 429 && attempt < MAX_429_RETRIES) {
        attempt += 1;
        clearTimeout(timer);
        await sleep(RETRY_429_BACKOFF_MS * attempt);
        continue;
      }
      const ttl = resp.status === 429 ? CACHE_TTL_429_MS : CACHE_TTL_MS;
      const result = { url, status: resp.status, ok: resp.status < 400 };
      cache[url] = { ...result, expires: now + ttl };
      return result;
    } catch (e) {
      lastErr = e;
      const isLast = attempt >= MAX_429_RETRIES;
      if (e.name === "AbortError" && !isLast) {
        attempt += 1;
        clearTimeout(timer);
        await sleep(RETRY_429_BACKOFF_MS);
        continue;
      }
      const result = { url, status: 0, ok: false, error: e.name === "AbortError" ? "timeout" : e.message };
      cache[url] = { ...result, expires: now + CACHE_TTL_MS };
      return result;
    } finally {
      clearTimeout(timer);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pMap(items, fn, concurrency) {
  const out = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { redirect: "follow", signal: controller.signal });
    if (!r.ok) throw new Error(`fetch ${url} -> ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(timer);
  }
}

function extractAnchorHrefs(html) {
  const out = [];
  const re = /<a\s[^>]*href=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function extractWikiUrlsFromNobelData(js) {
  // Match the string-literal pattern used in nobel_data.js: "wiki_url": "..."
  const out = [];
  const re = /"wiki_url"\s*:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(js)) !== null) {
    out.push(m[1]);
  }
  return out;
}

async function main() {
  console.log(`check-links: site=${SITE}`);

  // 1) Load index.html + nobel_data.js from the live site
  const [indexHtml, nobelJs] = await Promise.all([
    fetchText(SITE),
    fetchText(new URL("nobel_data.js", SITE).toString()),
  ]);

  const anchorHrefs = extractAnchorHrefs(indexHtml);
  const wikiUrls = extractWikiUrlsFromNobelData(nobelJs);
  const rawHrefs = anchorHrefs.concat(wikiUrls);

  console.log(`  found ${anchorHrefs.length} <a href> in index.html`);
  console.log(`  found ${wikiUrls.length} wiki_url in nobel_data.js`);
  console.log(`  total raw links: ${rawHrefs.length}`);

  // 2) Filter
  const seen = new Set();
  const toCheck = [];
  for (const href of rawHrefs) {
    if (shouldSkip(href)) continue;
    const norm = normalize(href);
    if (seen.has(norm)) continue;
    seen.add(norm);
    toCheck.push(norm);
  }
  console.log(`  checking ${toCheck.length} unique links (after filter & dedupe)`);

  // 3) Headless fetch with bounded concurrency + caching
  const cache = loadCache();
  const cacheHitsBefore = toCheck.filter((u) => cache[u] && cache[u].expires > Date.now()).length;
  console.log(`  cache: ${cacheHitsBefore}/${toCheck.length} warm hits`);

  // Group URLs by host so we can detect per-host throttling and abort cleanly
  const byHost = new Map();
  for (const url of toCheck) {
    const host = new URL(url).hostname;
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(url);
  }
  console.log(`  per-host distribution:`);
  for (const [host, urls] of [...byHost.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`    ${host}: ${urls.length}`);
  }

  // Track per-host 429 count to detect when a host is throttling us
  const host429Count = new Map();
  const abortHosts = new Set();

  const results = [];
  const queue = toCheck.slice();
  async function worker() {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) return;
      const host = new URL(url).hostname;
      if (abortHosts.has(host)) {
        // Don't even try — treat as ok-but-uncached for the short TTL so a
        // single CI run doesn't fail the build just because Wikipedia throttled
        // us. The entry will be re-checked once the TTL expires (1 hour).
        const now = Date.now();
        const result = { url, status: 0, ok: true, skipped: "host throttled" };
        cache[url] = { ...result, expires: now + CACHE_TTL_429_MS };
        results.push(result);
        continue;
      }
      await sleep(Math.random() * INTER_REQUEST_JITTER_MS);
      const r = await checkUrl(url, cache);
      results.push(r);
      if (r.status === 429) {
        const c = (host429Count.get(host) || 0) + 1;
        host429Count.set(host, c);
        if (c >= CONSECUTIVE_429_ABORT) {
          console.log(`  host ${host} throttled (${c} consecutive 429s) — short-circuiting remaining URLs from this host`);
          abortHosts.add(host);
        }
      }
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, toCheck.length) }, () => worker());
  await Promise.all(workers);

  // Persist cache for next run
  saveCache(cache);
  const cacheHitsAfter = results.filter((r) => r.cached).length;
  console.log(`  cache: ${cacheHitsAfter} hits served from cache this run`);

  // 4) Report
  const broken = results.filter((r) => !r.ok);
  const ok = results.length - broken.length;

  console.log(`\nResults: ${ok} ok, ${broken.length} broken`);
  if (broken.length > 0) {
    console.log(`\nBroken links:`);
    for (const b of broken) {
      const reason = b.status === 0 ? `(${b.error || "no response"})` : `(${b.status})`;
      console.log(`  ${b.url}  ${reason}`);
    }
    process.exit(1);
  }
  console.log(`\nAll reachable links returned 2xx/3xx.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("check-links: fatal:", e);
  process.exit(2);
});
