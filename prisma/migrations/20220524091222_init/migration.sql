/*
  Warnings:

  - A unique constraint covering the columns `[ruet_id]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ruet_id` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ruet_id" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_ruet_id_key" ON "User"("ruet_id");
