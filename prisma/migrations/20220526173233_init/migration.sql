/*
  Warnings:

  - You are about to drop the column `is_verifies` on the `User` table. All the data in the column will be lost.
  - Added the required column `is_verified` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "is_verifies",
ADD COLUMN     "is_verified" BOOLEAN NOT NULL;
