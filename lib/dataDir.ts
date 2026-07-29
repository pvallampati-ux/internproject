import path from "path";

// The bundled repo `data/` directory — always readable, holds the
// sample/seed files (contacts.sample.json, events.sample.json). On most
// hosts this doubles as the writable location too. Serverless hosts like
// Vercel ship the deployment as a read-only filesystem and only allow
// writes under /tmp, so the live data files must live there instead —
// each cold start reseeds from the bundled sample, which is the desired
// behavior for a public demo deploy (never touches real data, since real
// data files are gitignored and never make it into the deployment bundle).
export const SOURCE_DATA_DIR = path.join(process.cwd(), "data");
export const DATA_DIR = process.env.VERCEL ? "/tmp/data" : SOURCE_DATA_DIR;
