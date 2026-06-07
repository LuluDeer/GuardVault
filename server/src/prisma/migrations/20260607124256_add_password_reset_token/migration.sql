-- CreateTable
CREATE TABLE `password_reset_token` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `username` VARCHAR(32) NOT NULL,
    `token` VARCHAR(64) NOT NULL,
    `expire_at` DATETIME(3) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_reset_token_user_id_key`(`user_id`),
    UNIQUE INDEX `password_reset_token_token_key`(`token`),
    INDEX `password_reset_token_expire_at_idx`(`expire_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `password_reset_token` ADD CONSTRAINT `password_reset_token_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `system_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
