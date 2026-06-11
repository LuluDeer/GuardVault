-- CreateTable for TOTP recovery codes
CREATE TABLE `totp_recovery_code` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `code_hash` VARCHAR(64) NOT NULL,
  `used` BOOLEAN NOT NULL DEFAULT false,
  `used_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `totp_recovery_code_user_id_used_idx`(`user_id`, `used`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `totp_recovery_code` ADD CONSTRAINT `totp_recovery_code_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `system_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
