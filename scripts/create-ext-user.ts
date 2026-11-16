// Create (or reset the password of) a browser-extension login from the CLI.
// Usage: npm run ext-user -- <login> <password>
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hash } from "bcryptjs";

const [, , rawLogin, password] = process.argv;
const LOGIN_RE = /^[a-zA-Z0-9._-]{3,40}$/;

async function main() {
  const login = (rawLogin ?? "").trim().toLowerCase();
  if (!LOGIN_RE.test(login) || !password || password.length < 8) {
    console.error("Usage: npm run ext-user -- <login> <password(8+ chars)>");
    process.exit(1);
  }
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }),
  });
  const passwordHash = await hash(password, 10);
  const user = await prisma.extUser.upsert({
    where: { login },
    create: { login, passwordHash },
    update: { passwordHash },
  });
  await prisma.extSession.deleteMany({ where: { userId: user.id } });
  console.log(`Extension login ready: ${login}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
