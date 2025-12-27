ALTER TABLE "collections" ADD COLUMN "meta_title" jsonb;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "meta_description" jsonb;--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN "image_url";--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN "match_type";--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN "rules";--> statement-breakpoint
DROP TYPE "public"."collection_match_type";--> statement-breakpoint
DROP TYPE "public"."collection_type";