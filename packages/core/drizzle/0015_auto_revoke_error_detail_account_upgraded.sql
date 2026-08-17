ALTER TABLE "auto_revoke"."actions" ADD COLUMN "error_detail" text;--> statement-breakpoint
ALTER TABLE "auto_revoke"."permissions" ADD COLUMN "account_upgraded" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "auto_revoke"."permissions" ALTER COLUMN "account_upgraded" DROP DEFAULT;
