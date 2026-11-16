-- CreateTable
CREATE TABLE "ExtUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ExtSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "ExtSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ExtUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Capture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "imageFile" TEXT NOT NULL,
    "annotatedFile" TEXT,
    "pageUrl" TEXT NOT NULL,
    "pageTitle" TEXT,
    "note" TEXT,
    "pins" TEXT NOT NULL,
    "viewportWidth" INTEGER,
    "viewportHeight" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Capture_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ExtUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ExtUser_login_key" ON "ExtUser"("login");

-- CreateIndex
CREATE UNIQUE INDEX "ExtSession_tokenHash_key" ON "ExtSession"("tokenHash");

-- CreateIndex
CREATE INDEX "Capture_userId_createdAt_idx" ON "Capture"("userId", "createdAt");
