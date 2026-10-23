-- SQLite trigram tokenizer supports Chinese substring search (>= 3 unicode chars).
-- Published posts alone are included in the FTS index.
CREATE VIRTUAL TABLE "PostFTS" USING fts5(
    postId UNINDEXED, title, summary, markdown, tokenize = 'trigram'
);

INSERT INTO "PostFTS" (postId,title,summary,markdown)
SELECT id,title,summary,markdown FROM "Post" WHERE status = 'PUBLISHED';

CREATE TRIGGER "post_fts_insert" AFTER INSERT ON "Post"
WHEN NEW.status = 'PUBLISHED' BEGIN
  INSERT INTO "PostFTS" (postId,title,summary,markdown)
  VALUES (NEW.id,NEW.title,NEW.summary,NEW.markdown);
END;

CREATE TRIGGER "post_fts_delete" AFTER DELETE ON "Post" BEGIN
  DELETE FROM "PostFTS" WHERE postId = OLD.id;
END;

CREATE TRIGGER "post_fts_update" AFTER UPDATE ON "Post" BEGIN
  DELETE FROM "PostFTS" WHERE postId = OLD.id;
  INSERT INTO "PostFTS" (postId,title,summary,markdown)
  SELECT NEW.id,NEW.title,NEW.summary,NEW.markdown
  WHERE NEW.status = 'PUBLISHED';
END;

CREATE TABLE "PageViewDaily" (
  "day" TEXT NOT NULL,
  "pageKey" TEXT NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" DATETIME NOT NULL,
  PRIMARY KEY ("day", "pageKey")
);
CREATE INDEX "PageViewDaily_day_idx" ON "PageViewDaily"("day");
