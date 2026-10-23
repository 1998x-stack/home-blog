import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const postsDir = path.join(process.cwd(), 'content/posts');
const files = fs.readdirSync(postsDir).filter(file => file.endsWith('.md'));
const allowedTags = new Set(['nextjs','engineering','architecture','writing','devops']);

test('there are sample posts', () => assert.ok(files.length >= 2));
test('all posts have valid metadata and distinct filenames', () => {
  const seen = new Set();
  for (const file of files) {
    assert.match(file, /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/);
    assert.equal(seen.has(file), false); seen.add(file);
    const {data,content} = matter(fs.readFileSync(path.join(postsDir,file),'utf8'));
    assert.ok(typeof data.title === 'string' && data.title.length >= 3, file);
    assert.match(data.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(typeof data.summary === 'string' && data.summary.length >= 10, file);
    assert.ok(Array.isArray(data.tags) && data.tags.length > 0, file);
    assert.ok(data.tags.every(tag => allowedTags.has(tag)), file);
    assert.ok(typeof content === 'string' && content.trim().length > 20, file);
  }
});
