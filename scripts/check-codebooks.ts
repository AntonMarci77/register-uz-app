/**
 * Diagnostický skript — overí, čo RÚZ API vracia pre číselníky
 * Spustenie: npx tsx scripts/check-codebooks.ts
 */

const BASE_URL = "https://www.registeruz.sk/cruz-public/api";

const ENDPOINTS = [
  "pravne-formy",
  "sk-nace",
  "druhy-vlastnictva",
  "velkosti-organizacie",
  "kraje",
  "okresy",
  "sidla",
];

async function checkEndpoint(endpoint: string) {
  const url = `${BASE_URL}/${endpoint}`;
  console.log(`\n=== ${endpoint} ===`);
  console.log(`URL: ${url}`);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    console.log(`Status: ${res.status}`);
    console.log(`Content-Type: ${res.headers.get("content-type")}`);

    const text = await res.text();
    console.log(`Response length: ${text.length} chars`);

    // Try to parse as JSON
    try {
      const json = JSON.parse(text);
      const topKeys = Object.keys(json);
      console.log(`Top-level keys: ${topKeys.join(", ")}`);

      for (const key of topKeys) {
        const value = json[key];
        if (Array.isArray(value)) {
          console.log(`  ${key}: Array[${value.length}]`);
          if (value.length > 0) {
            console.log(`  First item: ${JSON.stringify(value[0]).substring(0, 200)}`);
          }
        } else if (typeof value === "object" && value !== null) {
          console.log(`  ${key}: Object with keys: ${Object.keys(value).join(", ")}`);
        } else {
          console.log(`  ${key}: ${typeof value} = ${String(value).substring(0, 100)}`);
        }
      }
    } catch {
      console.log(`Not valid JSON. First 300 chars: ${text.substring(0, 300)}`);
    }
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function main() {
  console.log("RÚZ API Codebook Diagnostics");
  console.log("============================");

  for (const endpoint of ENDPOINTS) {
    await checkEndpoint(endpoint);
  }

  // Also check the combined codebooks endpoint if it exists
  console.log("\n=== BONUS: /codebooks (ak existuje) ===");
  try {
    const res = await fetch(`${BASE_URL}/codebooks`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    console.log(`Status: ${res.status}`);
    if (res.ok) {
      const json = await res.json();
      console.log(`Top-level keys: ${Object.keys(json).join(", ")}`);
    }
  } catch (err) {
    console.log(`Not available: ${err instanceof Error ? err.message : String(err)}`);
  }
}

main();
