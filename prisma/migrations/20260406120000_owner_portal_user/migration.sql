ALTER TABLE `User` ADD COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'staff';
ALTER TABLE `User` ADD COLUMN `ownerGarageSaleId` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `User_ownerGarageSaleId_key` ON `User`(`ownerGarageSaleId`);
ALTER TABLE `User` ADD CONSTRAINT `User_ownerGarageSaleId_fkey` FOREIGN KEY (`ownerGarageSaleId`) REFERENCES `GarageSale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
