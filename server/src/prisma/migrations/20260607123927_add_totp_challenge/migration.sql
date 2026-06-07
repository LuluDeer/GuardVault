-- CreateTable
CREATE TABLE `department` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(64) NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `remark` VARCHAR(256) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `department_name_key`(`name`),
    UNIQUE INDEX `department_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(32) NOT NULL,
    `password` VARCHAR(128) NOT NULL,
    `role` VARCHAR(16) NOT NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `fail_count` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `last_login_time` DATETIME(3) NULL,
    `last_login_ip` VARCHAR(45) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `dept_id` INTEGER NULL,

    UNIQUE INDEX `system_user_username_key`(`username`),
    INDEX `system_user_dept_id_idx`(`dept_id`),
    INDEX `system_user_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_totp_key` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `encrypted_secret` VARCHAR(512) NOT NULL,
    `is_enable` INTEGER NOT NULL DEFAULT 0,
    `reset_count` INTEGER NOT NULL DEFAULT 0,
    `reset_time` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_totp_key_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_account` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(64) NOT NULL,
    `category` VARCHAR(32) NOT NULL,
    `identifier` VARCHAR(128) NULL,
    `url` VARCHAR(256) NULL,
    `remark` VARCHAR(256) NULL,
    `icon` VARCHAR(512) NULL,
    `encrypted_secret` VARCHAR(512) NOT NULL,
    `digits` INTEGER NOT NULL DEFAULT 6,
    `period` INTEGER NOT NULL DEFAULT 30,
    `algorithm` VARCHAR(191) NOT NULL DEFAULT 'SHA1',
    `status` INTEGER NOT NULL DEFAULT 1,
    `dept_id` INTEGER NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `service_account_dept_id_idx`(`dept_id`),
    INDEX `service_account_category_idx`(`category`),
    INDEX `service_account_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account_grant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `account_id` INTEGER NOT NULL,
    `granted_by_id` INTEGER NOT NULL,
    `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `remark` VARCHAR(256) NULL,

    INDEX `account_grant_user_id_idx`(`user_id`),
    INDEX `account_grant_account_id_idx`(`account_id`),
    UNIQUE INDEX `account_grant_user_id_account_id_key`(`user_id`, `account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account_favorite` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `account_id` INTEGER NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `pinned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `account_favorite_user_id_sort_order_idx`(`user_id`, `sort_order`),
    UNIQUE INDEX `account_favorite_user_id_account_id_key`(`user_id`, `account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `operator_id` INTEGER NOT NULL,
    `operator_name` VARCHAR(32) NOT NULL,
    `target_user_id` INTEGER NULL,
    `target_username` VARCHAR(32) NULL,
    `target_account_id` INTEGER NULL,
    `target_account_name` VARCHAR(64) NULL,
    `action_type` VARCHAR(32) NOT NULL,
    `action_desc` VARCHAR(512) NOT NULL,
    `client_ip` VARCHAR(45) NOT NULL,
    `user_agent` VARCHAR(256) NULL,
    `result` INTEGER NOT NULL,
    `fail_reason` VARCHAR(256) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `system_log_created_at_idx`(`created_at`),
    INDEX `system_log_operator_id_idx`(`operator_id`),
    INDEX `system_log_action_type_idx`(`action_type`),
    INDEX `system_log_target_account_id_idx`(`target_account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `config_key` VARCHAR(64) NOT NULL,
    `config_value` VARCHAR(256) NOT NULL,
    `description` VARCHAR(256) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` VARCHAR(32) NULL,

    UNIQUE INDEX `system_config_config_key_key`(`config_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `token_blacklist` (
    `jti` VARCHAR(64) NOT NULL,
    `expire_at` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `token_blacklist_expire_at_idx`(`expire_at`),
    PRIMARY KEY (`jti`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ip_block` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ip` VARCHAR(45) NOT NULL,
    `reason` VARCHAR(256) NOT NULL,
    `expire_at` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ip_block_ip_key`(`ip`),
    INDEX `ip_block_expire_at_idx`(`expire_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_attempt` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ip` VARCHAR(45) NOT NULL,
    `username` VARCHAR(32) NOT NULL,
    `resource` VARCHAR(32) NOT NULL,
    `attempt_number` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `login_attempt_ip_idx`(`ip`),
    INDEX `login_attempt_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_token` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(128) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `expire_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_token_token_key`(`token`),
    INDEX `refresh_token_user_id_idx`(`user_id`),
    INDEX `refresh_token_expire_at_idx`(`expire_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `totp_challenge` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `username` VARCHAR(32) NOT NULL,
    `token` VARCHAR(64) NOT NULL,
    `expire_at` DATETIME(3) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `totp_challenge_user_id_key`(`user_id`),
    INDEX `totp_challenge_expire_at_idx`(`expire_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `system_user` ADD CONSTRAINT `system_user_dept_id_fkey` FOREIGN KEY (`dept_id`) REFERENCES `department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_totp_key` ADD CONSTRAINT `user_totp_key_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `system_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_account` ADD CONSTRAINT `service_account_dept_id_fkey` FOREIGN KEY (`dept_id`) REFERENCES `department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_account` ADD CONSTRAINT `service_account_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `system_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_grant` ADD CONSTRAINT `account_grant_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `system_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_grant` ADD CONSTRAINT `account_grant_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `service_account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_grant` ADD CONSTRAINT `account_grant_granted_by_id_fkey` FOREIGN KEY (`granted_by_id`) REFERENCES `system_user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_favorite` ADD CONSTRAINT `account_favorite_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `system_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_favorite` ADD CONSTRAINT `account_favorite_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `service_account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_token` ADD CONSTRAINT `refresh_token_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `system_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `totp_challenge` ADD CONSTRAINT `totp_challenge_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `system_user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
