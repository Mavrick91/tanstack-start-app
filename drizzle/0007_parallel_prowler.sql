ALTER TABLE "product_variants" DROP COLUMN "inventory_quantity";--> statement-breakpoint
ALTER TABLE "product_variants" DROP COLUMN "inventory_policy";--> statement-breakpoint
DROP TYPE "public"."inventory_policy";