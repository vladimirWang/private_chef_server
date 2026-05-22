-- AlterTable: single image_url -> text[]
ALTER TABLE "dishes" ALTER COLUMN "image_url" TYPE TEXT[] USING ARRAY["image_url"]::TEXT[];
