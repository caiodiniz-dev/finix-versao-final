-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `dueDate` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `companyLogo` LONGTEXT NULL;
