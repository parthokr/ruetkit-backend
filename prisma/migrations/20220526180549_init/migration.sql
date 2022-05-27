/*
  Warnings:

  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'STAFF');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('RESTRICTED', 'UNRESTRICTED');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT E'USER',
DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT E'UNRESTRICTED';

-- DropEnum
DROP TYPE "ROLE";

-- DropEnum
DROP TYPE "STATUS";
