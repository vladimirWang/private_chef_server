-- CreateTable
CREATE TABLE "dishes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dish_descriptions" (
    "id" SERIAL NOT NULL,
    "dish_id" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'other',
    "content" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "dish_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dishes_user_id_idx" ON "dishes"("user_id");

-- CreateIndex
CREATE INDEX "dish_descriptions_dish_id_idx" ON "dish_descriptions"("dish_id");

-- AddForeignKey
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_descriptions" ADD CONSTRAINT "dish_descriptions_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "dishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
