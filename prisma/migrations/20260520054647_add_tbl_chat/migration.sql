-- CreateTable
CREATE TABLE "ChatSession" (
    "id" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_chat_messages" (
    "id" BIGSERIAL NOT NULL,
    "session_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "agent_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_chat_messages_session_id_idx" ON "agent_chat_messages"("session_id");

-- CreateIndex
CREATE INDEX "agent_chat_messages_user_id_idx" ON "agent_chat_messages"("user_id");

-- AddForeignKey
ALTER TABLE "agent_chat_messages" ADD CONSTRAINT "agent_chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ChatSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_chat_messages" ADD CONSTRAINT "agent_chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
