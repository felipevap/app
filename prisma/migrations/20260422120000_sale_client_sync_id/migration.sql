ALTER TABLE `Sale` ADD COLUMN `clientSyncId` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `Sale_clientSyncId_key` ON `Sale` (`clientSyncId`);
