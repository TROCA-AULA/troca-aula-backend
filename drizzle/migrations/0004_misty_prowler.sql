CREATE TABLE "NetworkInterconnections" (
	"id" serial PRIMARY KEY NOT NULL,
	"originNetworkId" integer NOT NULL,
	"allowedNetworkId" integer NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ProfessorNetworkInterests" (
	"professorId" integer NOT NULL,
	"networkId" integer NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "ProfessorNetworkInterests_professorId_networkId_pk" PRIMARY KEY("professorId","networkId")
);
--> statement-breakpoint
CREATE TABLE "ProfessorSchoolExclusions" (
	"professorId" integer NOT NULL,
	"schoolId" integer NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "ProfessorSchoolExclusions_professorId_schoolId_pk" PRIMARY KEY("professorId","schoolId")
);
--> statement-breakpoint
CREATE TABLE "SchoolPriorityTiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"schoolId" integer NOT NULL,
	"order" integer NOT NULL,
	"delayMinutes" integer DEFAULT 0 NOT NULL,
	"scopeType" text NOT NULL,
	"restrictedNetworkIds" jsonb,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "NetworkInterconnections" ADD CONSTRAINT "NetworkInterconnections_originNetworkId_Networks_id_fk" FOREIGN KEY ("originNetworkId") REFERENCES "public"."Networks"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "NetworkInterconnections" ADD CONSTRAINT "NetworkInterconnections_allowedNetworkId_Networks_id_fk" FOREIGN KEY ("allowedNetworkId") REFERENCES "public"."Networks"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ProfessorNetworkInterests" ADD CONSTRAINT "ProfessorNetworkInterests_professorId_Users_id_fk" FOREIGN KEY ("professorId") REFERENCES "public"."Users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ProfessorNetworkInterests" ADD CONSTRAINT "ProfessorNetworkInterests_networkId_Networks_id_fk" FOREIGN KEY ("networkId") REFERENCES "public"."Networks"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ProfessorSchoolExclusions" ADD CONSTRAINT "ProfessorSchoolExclusions_professorId_Users_id_fk" FOREIGN KEY ("professorId") REFERENCES "public"."Users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ProfessorSchoolExclusions" ADD CONSTRAINT "ProfessorSchoolExclusions_schoolId_Schools_id_fk" FOREIGN KEY ("schoolId") REFERENCES "public"."Schools"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SchoolPriorityTiers" ADD CONSTRAINT "SchoolPriorityTiers_schoolId_Schools_id_fk" FOREIGN KEY ("schoolId") REFERENCES "public"."Schools"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "NetworkInterconnections_origin_allowed_key" ON "NetworkInterconnections" USING btree ("originNetworkId","allowedNetworkId");--> statement-breakpoint
CREATE UNIQUE INDEX "SchoolPriorityTiers_schoolId_order_key" ON "SchoolPriorityTiers" USING btree ("schoolId","order");