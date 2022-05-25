-- CreateTable
CREATE TABLE "Code" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "Code_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Code_user_id_key" ON "Code"("user_id");

-- AddForeignKey
ALTER TABLE "Code" ADD CONSTRAINT "Code_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
