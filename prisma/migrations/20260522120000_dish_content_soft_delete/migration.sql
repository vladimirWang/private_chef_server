-- 正文迁入 dishes，软删除字段，删除 dish_descriptions
ALTER TABLE "dishes" ADD COLUMN "content" TEXT;

UPDATE "dishes" AS d
SET "content" = COALESCE(
  (
    SELECT string_agg(dd."content", E'\n' ORDER BY dd."sort_order")
    FROM "dish_descriptions" AS dd
    WHERE dd."dish_id" = d."id"
  ),
  ''
);

ALTER TABLE "dishes" ALTER COLUMN "content" SET NOT NULL;

ALTER TABLE "dishes" ADD COLUMN "deleted_at" TIMESTAMP(3);

DROP TABLE "dish_descriptions";
