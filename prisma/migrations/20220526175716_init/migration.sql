/*
  Warnings:

  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ROLE" AS ENUM ('USER', 'STAFF');

-- CreateEnum
CREATE TYPE "STATUS" AS ENUM ('RESTRICTED', 'UNRESTRICTED');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" "ROLE" NOT NULL DEFAULT E'USER',
DROP COLUMN "status",
ADD COLUMN     "status" "STATUS" NOT NULL DEFAULT E'UNRESTRICTED',
ALTER COLUMN "is_verified" SET DEFAULT false;
