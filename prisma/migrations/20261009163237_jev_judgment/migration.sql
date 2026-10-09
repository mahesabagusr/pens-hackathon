-- CreateTable
CREATE TABLE "JevJudgment" (
    "id" TEXT NOT NULL,
    "interaction_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "state_hash" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JevJudgment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JevJudgment_interaction_id_version_key" ON "JevJudgment"("interaction_id", "version");

-- AddForeignKey
ALTER TABLE "JevJudgment" ADD CONSTRAINT "JevJudgment_interaction_id_fkey" FOREIGN KEY ("interaction_id") REFERENCES "Interaction"("interaction_id") ON DELETE CASCADE ON UPDATE CASCADE;
