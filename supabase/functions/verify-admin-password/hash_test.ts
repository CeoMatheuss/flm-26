import "https://deno.land/std@0.224.0/dotenv/load.ts";

Deno.test("compute SHA-256 hash of ADM112828", async () => {
  const encoder = new TextEncoder();
  const data = encoder.encode("ADM112828");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  console.log("SHA-256 hash of ADM112828:", hash);
});
