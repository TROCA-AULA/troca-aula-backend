ALTER TABLE "EnrollmentRequest" ADD COLUMN "rejectionReason" text;--> statement-breakpoint
ALTER TABLE "Users" ADD COLUMN "residenceNetworkId" integer;--> statement-breakpoint
ALTER TABLE "Users" ADD CONSTRAINT "Users_residenceNetworkId_Networks_id_fk" FOREIGN KEY ("residenceNetworkId") REFERENCES "public"."Networks"("id") ON DELETE set null ON UPDATE cascade;