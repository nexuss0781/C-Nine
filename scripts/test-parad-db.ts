import { getDb, upsertUser, createDocumentForUser, getUserByOpenId } from "../server/db";

const db = await getDb();
if (!db) throw new Error("Paradox database did not initialize");
await upsertUser({ openId: "test-user", name: "Test User", email: "test@example.com", loginMethod: "test" });
const user = await getUserByOpenId("test-user");
if (!user?.id) throw new Error("User round-trip failed");
const document = await createDocumentForUser({
  userId: user.id,
  filename: "sample.pdf",
  storageKey: "test/sample.pdf",
  storageUrl: "https://example.invalid/sample.pdf",
  mimeType: "application/pdf",
  sizeBytes: 123,
});
if (!document?.id || document.status !== "processing") throw new Error("Document round-trip failed");
console.log(JSON.stringify({ userId: user.id, documentId: document.id, status: document.status }));
db.close();
