-- CreateEnum
CREATE TYPE "Role" AS ENUM ('athlete', 'coach', 'admin');

-- CreateEnum
CREATE TYPE "Sport" AS ENUM ('running', 'cycling', 'swimming', 'strength', 'other');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'athlete',
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "sport" "Sport" NOT NULL,
    "distance_km" DOUBLE PRECISION,
    "avg_heart_rate" INTEGER,
    "cadence_spm" INTEGER,
    "notes" TEXT,
    "user_id" UUID NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
