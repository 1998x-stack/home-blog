CREATE TABLE "User" (
 "id" TEXT NOT NULL PRIMARY KEY, "email" TEXT NOT NULL, "displayName" TEXT NOT NULL,
 "passwordHash" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'EDITOR', "disabled" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "Session" (
 "id" TEXT NOT NULL PRIMARY KEY, "tokenHash" TEXT NOT NULL, "userId" TEXT NOT NULL,
 "expiresAt" DATETIME NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId","expiresAt");
CREATE TABLE "LoginAttempt" (
 "id" TEXT NOT NULL PRIMARY KEY,"key" TEXT NOT NULL,"createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "LoginAttempt_key_createdAt_idx" ON "LoginAttempt"("key","createdAt");
CREATE TABLE "Post" (
 "id" TEXT NOT NULL PRIMARY KEY,"slug" TEXT NOT NULL,"title" TEXT NOT NULL,"summary" TEXT NOT NULL,
 "markdown" TEXT NOT NULL,"tags" TEXT NOT NULL DEFAULT '[]',"featured" BOOLEAN NOT NULL DEFAULT false,
 "status" TEXT NOT NULL DEFAULT 'DRAFT',"revision" INTEGER NOT NULL DEFAULT 1,"publishedAt" DATETIME,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" DATETIME NOT NULL,
 "authorId" TEXT NOT NULL,
 CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");
CREATE INDEX "Post_status_publishedAt_idx" ON "Post"("status","publishedAt");
CREATE TABLE "PostRevision" (
 "id" TEXT NOT NULL PRIMARY KEY,"postId" TEXT NOT NULL,"revision" INTEGER NOT NULL,"title" TEXT NOT NULL,
 "summary" TEXT NOT NULL,"markdown" TEXT NOT NULL,"tags" TEXT NOT NULL,"status" TEXT NOT NULL,"editorId" TEXT NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PostRevision_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "PostRevision_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PostRevision_postId_revision_key" ON "PostRevision"("postId","revision");
CREATE TABLE "Media" (
 "id" TEXT NOT NULL PRIMARY KEY,"originalName" TEXT NOT NULL,"storedName" TEXT NOT NULL,
 "mimeType" TEXT NOT NULL,"byteSize" INTEGER NOT NULL,"sha256" TEXT NOT NULL,"isPublic" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"uploaderId" TEXT NOT NULL,
 CONSTRAINT "Media_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Media_storedName_key" ON "Media"("storedName");
