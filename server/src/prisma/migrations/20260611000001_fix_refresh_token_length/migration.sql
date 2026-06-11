-- Reduce refresh_token.token column from VARCHAR(128) to VARCHAR(64)
-- Tokens are now stored as SHA-256 hex digests (64 chars) instead of raw 128-char hex strings
ALTER TABLE `refresh_token` MODIFY COLUMN `token` VARCHAR(64) NOT NULL;
