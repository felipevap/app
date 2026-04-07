ALTER TABLE `Tenant`
    ADD COLUMN `subscriptionPlanCode` VARCHAR(191) NOT NULL DEFAULT 'premium-full',
    ADD COLUMN `subscriptionPlanName` VARCHAR(191) NOT NULL DEFAULT 'Premium Full',
    ADD COLUMN `subscriptionStatus` VARCHAR(191) NOT NULL DEFAULT 'trialing',
    ADD COLUMN `subscriptionMonthlyPriceCents` INTEGER NOT NULL DEFAULT 19700,
    ADD COLUMN `billingEmail` VARCHAR(191) NULL,
    ADD COLUMN `subscriptionStartedAt` DATETIME(3) NULL,
    ADD COLUMN `trialEndsAt` DATETIME(3) NULL,
    ADD COLUMN `nextBillingAt` DATETIME(3) NULL,
    ADD COLUMN `lastPaymentAt` DATETIME(3) NULL;

ALTER TABLE `User`
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

UPDATE `Tenant`
SET
    `subscriptionStartedAt` = COALESCE(`subscriptionStartedAt`, `createdAt`),
    `trialEndsAt` = COALESCE(`trialEndsAt`, DATE_ADD(COALESCE(`subscriptionStartedAt`, `createdAt`), INTERVAL 14 DAY)),
    `nextBillingAt` = COALESCE(`nextBillingAt`, DATE_ADD(COALESCE(`subscriptionStartedAt`, `createdAt`), INTERVAL 14 DAY))
WHERE `subscriptionStatus` = 'trialing';
