ALTER TABLE `GarageSale` ADD COLUMN `itemsRegistrationComplete` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `GarageSale` ADD COLUMN `itemsRegistrationCompletedAt` DATETIME(3) NULL;

CREATE TABLE `GarageSaleContractTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `garageSaleId` VARCHAR(191) NOT NULL,
    `phase` VARCHAR(191) NOT NULL,
    `sourceFileName` VARCHAR(191) NULL,
    `segments` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GarageSaleContractTemplate_garageSaleId_phase_key`(`garageSaleId`, `phase`),
    INDEX `GarageSaleContractTemplate_garageSaleId_idx`(`garageSaleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `GarageSaleContractAcceptance` (
    `id` VARCHAR(191) NOT NULL,
    `garageSaleId` VARCHAR(191) NOT NULL,
    `signerUserId` VARCHAR(191) NOT NULL,
    `phase` VARCHAR(191) NOT NULL,
    `renderedBody` LONGTEXT NOT NULL,
    `signaturePng` LONGTEXT NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `GarageSaleContractAcceptance_garageSaleId_phase_signerUserId_key`(`garageSaleId`, `phase`, `signerUserId`),
    INDEX `GarageSaleContractAcceptance_garageSaleId_idx`(`garageSaleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `GarageSaleContractTemplate` ADD CONSTRAINT `GarageSaleContractTemplate_garageSaleId_fkey` FOREIGN KEY (`garageSaleId`) REFERENCES `GarageSale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `GarageSaleContractAcceptance` ADD CONSTRAINT `GarageSaleContractAcceptance_garageSaleId_fkey` FOREIGN KEY (`garageSaleId`) REFERENCES `GarageSale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `GarageSaleContractAcceptance` ADD CONSTRAINT `GarageSaleContractAcceptance_signerUserId_fkey` FOREIGN KEY (`signerUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
