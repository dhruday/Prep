// ── Posts routes — for optimistic updates, deduplication, todo labs ──────────
const express = require('express');
const router = express.Router();
const { statements } = require('../db');
const { randomDelay } = require('../middleware/delay');

// ── GET /api/posts — paginated feed ─────────────────────────────────────────
router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  const posts = statements.getPosts.all(limit, offset);
  const { total } = statements.getPostCount.get();

  // Attach tags to each post
  for (const post of posts) {
    post.tags = statements.getPostTags.all(post.id).map(t => t.name);
  }

  res.json({
    data: posts,
    meta: { page, limit, total, hasMore: page * limit < total },
  });
});

// ── GET /api/posts/:id ──────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const post = statements.getPostById.get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  post.tags = statements.getPostTags.all(post.id).map(t => t.name);
  res.json(post);
});

// ── POST /api/posts — create a post (for optimistic update labs) ────────────
router.post('/', randomDelay(300, 1200), (req, res) => {
  const { title, body, user_id } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });

  const userId = user_id || 1;
  const result = statements.createPost.run(userId, title, body);
  const post = statements.getPostById.get(result.lastInsertRowid);
  post.tags = [];

  res.status(201).json(post);
});

// ── PUT /api/posts/:id ──────────────────────────────────────────────────────
router.put('/:id', randomDelay(200, 800), (req, res) => {
  const existing = statements.getPostById.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Post not found' });

  const { title, body } = req.body;
  statements.updatePost.run(title || existing.title, body || existing.body, req.params.id);
  const updated = statements.getPostById.get(req.params.id);
  updated.tags = statements.getPostTags.all(updated.id).map(t => t.name);
  res.json(updated);
});

// ── DELETE /api/posts/:id ───────────────────────────────────────────────────
router.delete('/:id', randomDelay(200, 600), (req, res) => {
  const existing = statements.getPostById.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Post not found' });

  statements.deletePost.run(req.params.id);
  res.status(204).end();
});

// ── POST /api/posts/:id/like — optimistic like toggle ───────────────────────
router.post('/:id/like', randomDelay(200, 1000), (req, res) => {
  const existing = statements.getPostById.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Post not found' });

  // Simulate occasional failure (for rollback testing)
  if (Math.random() < 0.15) {
    return res.status(500).json({ error: 'Like service temporarily unavailable' });
  }

  statements.likePost.run(req.params.id);
  const updated = statements.getPostById.get(req.params.id);
  res.json({ id: updated.id, likes: updated.likes });
});

// ── POST /api/posts/:id/unlike ──────────────────────────────────────────────
router.post('/:id/unlike', randomDelay(200, 1000), (req, res) => {
  const existing = statements.getPostById.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Post not found' });

  statements.unlikePost.run(req.params.id);
  const updated = statements.getPostById.get(req.params.id);
  res.json({ id: updated.id, likes: updated.likes });
});

// ── Todos — optimistic CRUD ─────────────────────────────────────────────────
router.get('/todos/:userId', (req, res) => {
  const todos = statements.getTodos.all(req.params.userId);
  res.json({ data: todos });
});

router.post('/todos', randomDelay(300, 1500), (req, res) => {
  const { user_id, text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  // Simulate failure for rollback demo
  if (Math.random() < 0.1) {
    return res.status(500).json({ error: 'Failed to create todo' });
  }

  const result = statements.createTodo.run(user_id || 1, text);
  const todo = { id: result.lastInsertRowid, user_id: user_id || 1, text, completed: 0 };
  res.status(201).json(todo);
});

router.patch('/todos/:id/toggle', randomDelay(200, 800), (req, res) => {
  statements.toggleTodo.run(req.params.id);
  res.json({ id: parseInt(req.params.id), toggled: true });
});

router.delete('/todos/:id', randomDelay(200, 600), (req, res) => {
  statements.deleteTodo.run(req.params.id);
  res.status(204).end();
});

module.exports = router;
