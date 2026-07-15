import path from "node:path";

process.env.DATABASE_URL = `file:${path.join(process.cwd(), "prisma", "test.db")}`;
process.env.ADMIN_PASSWORD ??= "test-admin-password";
process.env.ADMIN_SECRET ??= "test-admin-secret";
