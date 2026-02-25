-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AIProvider" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "defaultModel" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "AIProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AIProvider" ("apiKey", "createdAt", "defaultModel", "id", "isDefault", "name", "provider") SELECT "apiKey", "createdAt", "defaultModel", "id", "isDefault", "name", "provider" FROM "AIProvider";
DROP TABLE "AIProvider";
ALTER TABLE "new_AIProvider" RENAME TO "AIProvider";
CREATE UNIQUE INDEX "AIProvider_userId_provider_key" ON "AIProvider"("userId", "provider");
CREATE TABLE "new_ArgoServer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "authType" TEXT NOT NULL,
    "token" TEXT,
    "username" TEXT,
    "password" TEXT,
    "insecure" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ArgoServer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ArgoServer" ("authType", "createdAt", "id", "insecure", "isDefault", "name", "password", "token", "url", "username") SELECT "authType", "createdAt", "id", "insecure", "isDefault", "name", "password", "token", "url", "username" FROM "ArgoServer";
DROP TABLE "ArgoServer";
ALTER TABLE "new_ArgoServer" RENAME TO "ArgoServer";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
