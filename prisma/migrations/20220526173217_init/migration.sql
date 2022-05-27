/*
  Warnings:

  - Added the required column `is_verifies` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "is_verifies" BOOLEAN NOT NULL;
