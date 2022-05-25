/*
  Warnings:

  - You are about to alter the column `fullname` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(25)`.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "fullname" SET DATA TYPE VARCHAR(25);
