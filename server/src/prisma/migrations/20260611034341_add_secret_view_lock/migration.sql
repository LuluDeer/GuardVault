-- AlterTable
ALTER TABLE `system_user` ADD COLUMN `secret_view_fails` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `secret_view_locked_until` DATETIME(3) NULL;
