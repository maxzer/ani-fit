-- CreateTable
CREATE TABLE "viewed_price_lists" (
    "id" SERIAL NOT NULL,
    "serviceTitle" TEXT NOT NULL,
    "isViewed" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "viewed_price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "viewed_price_lists_userId_serviceTitle_key" ON "viewed_price_lists"("userId", "serviceTitle");

-- AddForeignKey
ALTER TABLE "viewed_price_lists" ADD CONSTRAINT "viewed_price_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
