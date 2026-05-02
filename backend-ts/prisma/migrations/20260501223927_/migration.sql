-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "photo" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "transactionsUsed" INTEGER NOT NULL DEFAULT 0,
    "transactionsMonth" TEXT NOT NULL DEFAULT '',
    "planExpiresAt" DATETIME,
    "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "usageType" TEXT,
    "companyName" TEXT,
    "companyLogo" TEXT,
    "businessPurpose" TEXT,
    "primaryColor" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationCode" TEXT,
    "verificationExpires" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "date" DATETIME NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringFrequency" TEXT,
    "paymentMethod" TEXT DEFAULT 'pix',
    "installments" INTEGER NOT NULL DEFAULT 1,
    "installmentNumber" INTEGER,
    "totalInstallments" INTEGER,
    "totalAmount" REAL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetAmount" REAL NOT NULL,
    "currentAmount" REAL NOT NULL DEFAULT 0,
    "deadline" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "limit" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "userEmail" TEXT,
    "sessionId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'brl',
    "plan" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "status" TEXT NOT NULL DEFAULT 'initiated',
    "stripePaymentId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_userId_category_key" ON "budgets"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_sessionId_key" ON "payment_transactions"("sessionId");
