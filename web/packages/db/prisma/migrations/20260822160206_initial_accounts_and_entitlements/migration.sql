-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'GRACE', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "EntitlementSource" AS ENUM ('STRIPE', 'APP_STORE', 'MANUAL');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlements" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "EntitlementStatus" NOT NULL,
    "source" "EntitlementSource" NOT NULL,
    "productId" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "externalRef" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_webhook_events" (
    "id" TEXT NOT NULL,
    "provider" "EntitlementSource" NOT NULL,
    "eventId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_clerkUserId_key" ON "accounts"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_accountId_key" ON "entitlements"("accountId");

-- CreateIndex
CREATE INDEX "entitlements_status_idx" ON "entitlements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "processed_webhook_events_provider_eventId_key" ON "processed_webhook_events"("provider", "eventId");

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
