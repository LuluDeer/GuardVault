-- CreateIndex
CREATE INDEX `system_log_created_at_operator_id_idx` ON `system_log`(`created_at`, `operator_id`);

-- CreateIndex
CREATE INDEX `system_user_status_idx` ON `system_user`(`status`);

-- CreateIndex
CREATE INDEX `system_user_username_idx` ON `system_user`(`username`);
