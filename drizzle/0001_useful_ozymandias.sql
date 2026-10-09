CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"items" jsonb NOT NULL,
	"total" numeric(12, 2) NOT NULL
);
