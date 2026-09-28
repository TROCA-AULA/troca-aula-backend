CREATE TABLE "ProfessorSchoolGroups" (
	"professorId" integer NOT NULL,
	"groupId" integer NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "ProfessorSchoolGroups_professorId_groupId_pk" PRIMARY KEY("professorId","groupId")
);
--> statement-breakpoint
CREATE TABLE "SchoolTeacherGroups" (
	"id" serial PRIMARY KEY NOT NULL,
	"schoolId" integer NOT NULL,
	"name" text NOT NULL,
	"delayMinutes" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Schools" ADD COLUMN "ungroupedDelayMinutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Schools" ADD COLUMN "acceptedNetworkIds" jsonb;--> statement-breakpoint
ALTER TABLE "ProfessorSchoolGroups" ADD CONSTRAINT "ProfessorSchoolGroups_professorId_Users_id_fk" FOREIGN KEY ("professorId") REFERENCES "public"."Users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ProfessorSchoolGroups" ADD CONSTRAINT "ProfessorSchoolGroups_groupId_SchoolTeacherGroups_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."SchoolTeacherGroups"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "SchoolTeacherGroups" ADD CONSTRAINT "SchoolTeacherGroups_schoolId_Schools_id_fk" FOREIGN KEY ("schoolId") REFERENCES "public"."Schools"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "SchoolTeacherGroups_schoolId_name_key" ON "SchoolTeacherGroups" USING btree ("schoolId","name");