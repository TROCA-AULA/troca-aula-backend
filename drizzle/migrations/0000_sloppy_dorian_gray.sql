CREATE TABLE "Classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"schoolId" integer NOT NULL,
	"subjectId" integer NOT NULL,
	"createdByd" integer NOT NULL,
	"registredById" integer,
	"approvedById" integer,
	"profileId" integer,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"finishedAt" timestamp (3),
	"deletedAt" timestamp (3),
	"statededAt" timestamp (3),
	"approvedAt" timestamp (3),
	"dayOfWeek" integer,
	"startTime" text,
	"endTime" text,
	"enrolledById" integer,
	"available" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "EnrollmentRequest" (
	"id" serial PRIMARY KEY NOT NULL,
	"classId" integer NOT NULL,
	"professorId" integer NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Schools" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"substitutionLimitPerSemester" integer,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "Subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "Users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"password" text NOT NULL,
	"subjectId" integer,
	"substitutionLimitPerSemester" integer,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"deletedAt" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "UsersProfilesSchools" (
	"schoolId" integer NOT NULL,
	"userId" integer NOT NULL,
	"profileId" integer NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"approvedAt" timestamp (3),
	"approvedById" integer,
	CONSTRAINT "UsersProfilesSchools_userId_profileId_schoolId_pk" PRIMARY KEY("userId","profileId","schoolId")
);
--> statement-breakpoint
ALTER TABLE "Classes" ADD CONSTRAINT "Classes_schoolId_Schools_id_fk" FOREIGN KEY ("schoolId") REFERENCES "public"."Schools"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Classes" ADD CONSTRAINT "Classes_subjectId_Subjects_id_fk" FOREIGN KEY ("subjectId") REFERENCES "public"."Subjects"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Classes" ADD CONSTRAINT "Classes_createdByd_Users_id_fk" FOREIGN KEY ("createdByd") REFERENCES "public"."Users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Classes" ADD CONSTRAINT "Classes_registredById_Users_id_fk" FOREIGN KEY ("registredById") REFERENCES "public"."Users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Classes" ADD CONSTRAINT "Classes_approvedById_Users_id_fk" FOREIGN KEY ("approvedById") REFERENCES "public"."Users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Classes" ADD CONSTRAINT "Classes_profileId_Profiles_id_fk" FOREIGN KEY ("profileId") REFERENCES "public"."Profiles"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Classes" ADD CONSTRAINT "Classes_enrolledById_Users_id_fk" FOREIGN KEY ("enrolledById") REFERENCES "public"."Users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EnrollmentRequest" ADD CONSTRAINT "EnrollmentRequest_classId_Classes_id_fk" FOREIGN KEY ("classId") REFERENCES "public"."Classes"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "EnrollmentRequest" ADD CONSTRAINT "EnrollmentRequest_professorId_Users_id_fk" FOREIGN KEY ("professorId") REFERENCES "public"."Users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UsersProfilesSchools" ADD CONSTRAINT "UsersProfilesSchools_schoolId_Schools_id_fk" FOREIGN KEY ("schoolId") REFERENCES "public"."Schools"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UsersProfilesSchools" ADD CONSTRAINT "UsersProfilesSchools_userId_Users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UsersProfilesSchools" ADD CONSTRAINT "UsersProfilesSchools_profileId_Profiles_id_fk" FOREIGN KEY ("profileId") REFERENCES "public"."Profiles"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UsersProfilesSchools" ADD CONSTRAINT "UsersProfilesSchools_approvedById_Users_id_fk" FOREIGN KEY ("approvedById") REFERENCES "public"."Users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "EnrollmentRequest_classId_idx" ON "EnrollmentRequest" USING btree ("classId");--> statement-breakpoint
CREATE INDEX "EnrollmentRequest_professorId_idx" ON "EnrollmentRequest" USING btree ("professorId");--> statement-breakpoint
CREATE INDEX "EnrollmentRequest_status_idx" ON "EnrollmentRequest" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "Users_email_key" ON "Users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "Users_email_idx" ON "Users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "UsersProfilesSchools_schoolId_idx" ON "UsersProfilesSchools" USING btree ("schoolId");--> statement-breakpoint
CREATE INDEX "UsersProfilesSchools_userId_idx" ON "UsersProfilesSchools" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "UsersProfilesSchools_profileId_idx" ON "UsersProfilesSchools" USING btree ("profileId");