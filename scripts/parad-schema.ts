import { getDb } from "../server/db";

const db = await getDb();
if (!db) throw new Error("Set DATABASE_URL to a canonical parad:// URL before running db:push");
db.close();
console.log("Paradox schema bootstrap completed.");
