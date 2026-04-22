ALTER TABLE `GarageSale` ADD COLUMN `slug` VARCHAR(191) NULL;
ALTER TABLE `GarageSale` ADD COLUMN `horarioInicio` VARCHAR(191) NULL;
ALTER TABLE `GarageSale` ADD COLUMN `horarioFim` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `GarageSale_slug_key` ON `GarageSale`(`slug`);
