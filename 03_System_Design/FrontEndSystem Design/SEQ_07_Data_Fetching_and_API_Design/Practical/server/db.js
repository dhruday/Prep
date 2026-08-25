// ─────────────────────────────────────────────────────────────────────────────
// db.js — SQLite Database Setup for Data Fetching Labs
// ─────────────────────────────────────────────────────────────────────────────
// Tables: products, categories, users, posts, comments, tags
// Seeded with 10,000+ records for pagination/performance testing
// ─────────────────────────────────────────────────────────────────────────────

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT,
    price       REAL    NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    rating      REAL    DEFAULT 0,
    stock       INTEGER DEFAULT 0,
    image_url   TEXT,
    created_at  TEXT    DEFAULT (datetime('now')),
    updated_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT UNIQUE NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    bio        TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    title      TEXT    NOT NULL,
    body       TEXT    NOT NULL,
    likes      INTEGER DEFAULT 0,
    created_at TEXT    DEFAULT (datetime('now')),
    updated_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    body       TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tags (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    tag_id  INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS todos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    text       TEXT    NOT NULL,
    completed  INTEGER DEFAULT 0,
    created_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS idempotency_keys (
    key        TEXT PRIMARY KEY,
    response   TEXT NOT NULL,
    status     INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  CREATE INDEX IF NOT EXISTS idx_products_price    ON products(price);
  CREATE INDEX IF NOT EXISTS idx_products_created  ON products(created_at);
  CREATE INDEX IF NOT EXISTS idx_posts_user        ON posts(user_id);
  CREATE INDEX IF NOT EXISTS idx_posts_created     ON posts(created_at);
  CREATE INDEX IF NOT EXISTS idx_comments_post     ON comments(post_id);
`);

// ── Seed Data ───────────────────────────────────────────────────────────────

const categoryCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;

if (categoryCount === 0) {
  console.log('🌱 Seeding database with 10,000+ records...');

  const cats = ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 'Toys', 'Food', 'Automotive', 'Health', 'Music'];
  const insertCat = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)');
  for (const c of cats) insertCat.run(c, c.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

  const adjectives = ['Premium', 'Classic', 'Ultra', 'Pro', 'Elite', 'Basic', 'Deluxe', 'Smart', 'Eco', 'Vintage'];
  const nouns = ['Widget', 'Gadget', 'Device', 'Tool', 'Kit', 'Set', 'Pack', 'Bundle', 'System', 'Unit'];

  const insertProduct = db.prepare('INSERT INTO products (name, description, price, category_id, rating, stock) VALUES (?, ?, ?, ?, ?, ?)');
  const insertMany = db.transaction(() => {
    for (let i = 0; i < 10000; i++) {
      const adj = adjectives[i % adjectives.length];
      const noun = nouns[Math.floor(i / adjectives.length) % nouns.length];
      const catId = (i % cats.length) + 1;
      const price = +(5 + Math.random() * 995).toFixed(2);
      const rating = +(1 + Math.random() * 4).toFixed(1);
      const stock = Math.floor(Math.random() * 500);
      insertProduct.run(`${adj} ${noun} ${i + 1}`, `High-quality ${adj.toLowerCase()} ${noun.toLowerCase()} #${i + 1}`, price, catId, rating, stock);
    }
  });
  insertMany();

  const insertUser = db.prepare('INSERT INTO users (username, email, avatar_url, bio) VALUES (?, ?, ?, ?)');
  const userNames = ['alice', 'bob', 'charlie', 'diana', 'eve', 'frank', 'grace', 'hank', 'ivy', 'jack',
    'kate', 'leo', 'mia', 'nick', 'olivia', 'pete', 'quinn', 'rosa', 'sam', 'tina'];
  for (const u of userNames) {
    insertUser.run(u, `${u}@example.com`, `https://api.dicebear.com/7.x/initials/svg?seed=${u}`, `Software engineer who loves ${u[0] > 'm' ? 'frontend' : 'backend'} development.`);
  }

  const insertPost = db.prepare('INSERT INTO posts (user_id, title, body, likes, created_at) VALUES (?, ?, ?, ?, ?)');
  const insertComment = db.prepare('INSERT INTO comments (post_id, user_id, body, created_at) VALUES (?, ?, ?, ?)');
  const topics = ['React', 'TypeScript', 'Node.js', 'GraphQL', 'REST APIs', 'System Design', 'Performance', 'Testing', 'CI/CD', 'Docker'];

  const seedPosts = db.transaction(() => {
    for (let i = 0; i < 500; i++) {
      const userId = (i % 20) + 1;
      const topic = topics[i % topics.length];
      const daysAgo = 500 - i;
      const date = new Date(Date.now() - daysAgo * 86400000).toISOString().replace('T', ' ').slice(0, 19);
      insertPost.run(userId, `Deep Dive into ${topic} — Part ${Math.floor(i / 10) + 1}`, `A comprehensive guide to ${topic}. In this post we explore advanced patterns, common pitfalls, and production-ready solutions. Post #${i + 1}.`, Math.floor(Math.random() * 200), date);
    }
    for (let i = 0; i < 2000; i++) {
      const postId = (i % 500) + 1;
      const userId = (i % 20) + 1;
      const daysAgo = Math.floor(Math.random() * 400);
      const date = new Date(Date.now() - daysAgo * 86400000).toISOString().replace('T', ' ').slice(0, 19);
      insertComment.run(postId, userId, `Great insights! Comment #${i + 1}. I especially liked the part about error handling.`, date);
    }
  });
  seedPosts();

  const insertTag = db.prepare('INSERT INTO tags (name) VALUES (?)');
  const insertPostTag = db.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)');
  const tagNames = ['javascript', 'typescript', 'react', 'nodejs', 'api', 'performance', 'testing', 'devops', 'frontend', 'backend'];
  for (const t of tagNames) insertTag.run(t);
  for (let i = 1; i <= 500; i++) {
    insertPostTag.run(i, (i % 10) + 1);
    insertPostTag.run(i, ((i + 3) % 10) + 1);
  }

  const insertTodo = db.prepare('INSERT INTO todos (user_id, text, completed) VALUES (?, ?, ?)');
  for (let i = 0; i < 50; i++) {
    insertTodo.run((i % 5) + 1, `Task #${i + 1}: Implement feature ${String.fromCharCode(65 + (i % 26))}`, i % 3 === 0 ? 1 : 0);
  }

  console.log('✅ Seeded: 10,000 products, 20 users, 500 posts, 2,000 comments, 50 todos');
}

// ── Prepared Statements ─────────────────────────────────────────────────────

const statements = {
  // Products
  getProducts: db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.id LIMIT ? OFFSET ?'),
  getProductsCursor: db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id > ? ORDER BY p.id LIMIT ?'),
  getProductsCursorDesc: db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id < ? ORDER BY p.id DESC LIMIT ?'),
  getProductCount: db.prepare('SELECT COUNT(*) as total FROM products'),
  getProductById: db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?'),
  searchProducts: db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.name LIKE ? ORDER BY p.id LIMIT ?'),
  getProductsByCategory: db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE c.slug = ? ORDER BY p.id LIMIT ? OFFSET ?'),
  getProductsByPriceRange: db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.price BETWEEN ? AND ? ORDER BY p.price LIMIT ? OFFSET ?'),
  getProductsKeyset: db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE (p.price > ? OR (p.price = ? AND p.id > ?)) ORDER BY p.price, p.id LIMIT ?'),

  // Posts
  getPosts: db.prepare('SELECT p.*, u.username, u.avatar_url FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?'),
  getPostsCursor: db.prepare('SELECT p.*, u.username, u.avatar_url FROM posts p JOIN users u ON p.user_id = u.id WHERE p.created_at < ? OR (p.created_at = ? AND p.id < ?) ORDER BY p.created_at DESC, p.id DESC LIMIT ?'),
  getPostById: db.prepare('SELECT p.*, u.username, u.avatar_url FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?'),
  getPostCount: db.prepare('SELECT COUNT(*) as total FROM posts'),
  createPost: db.prepare('INSERT INTO posts (user_id, title, body, likes) VALUES (?, ?, ?, 0)'),
  updatePost: db.prepare('UPDATE posts SET title = ?, body = ?, updated_at = datetime(\'now\') WHERE id = ?'),
  deletePost: db.prepare('DELETE FROM posts WHERE id = ?'),
  likePost: db.prepare('UPDATE posts SET likes = likes + 1 WHERE id = ?'),
  unlikePost: db.prepare('UPDATE posts SET likes = MAX(0, likes - 1) WHERE id = ?'),

  // Comments
  getComments: db.prepare('SELECT c.*, u.username, u.avatar_url FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.created_at DESC LIMIT ? OFFSET ?'),
  getCommentCount: db.prepare('SELECT COUNT(*) as total FROM comments WHERE post_id = ?'),
  createComment: db.prepare('INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)'),

  // Users
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),

  // Todos
  getTodos: db.prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY id'),
  createTodo: db.prepare('INSERT INTO todos (user_id, text, completed) VALUES (?, ?, 0)'),
  toggleTodo: db.prepare('UPDATE todos SET completed = NOT completed WHERE id = ?'),
  deleteTodo: db.prepare('DELETE FROM todos WHERE id = ?'),

  // Idempotency
  getIdempotencyKey: db.prepare('SELECT * FROM idempotency_keys WHERE key = ?'),
  setIdempotencyKey: db.prepare('INSERT INTO idempotency_keys (key, response, status) VALUES (?, ?, ?)'),

  // Categories
  getCategories: db.prepare('SELECT * FROM categories ORDER BY name'),

  // Tags
  getPostTags: db.prepare('SELECT t.name FROM post_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.post_id = ?'),
};

module.exports = { db, statements };
