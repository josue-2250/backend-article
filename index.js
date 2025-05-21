// index.js
// Full API with Sign-up, Login, and Article CRUD using in-memory arrays

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory databases
let users = [];
let articles = [];
let nextUserId = 1;
let nextArticleId = 1;

// Simple session store
let sessions = {}; // sessionToken => userId

function generateToken() {
  return Math.random().toString(36).substring(2);
}

// Sign-up: POST /signup
app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists.' });
  }

  const newUser = { id: nextUserId++, username, password };
  users.push(newUser);
  res.status(201).json({ message: 'User created successfully', userId: newUser.id });
});

// Login: POST /login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken();
  sessions[token] = user.id;

  res.json({ message: 'Login successful', token });
});

// Middleware to protect article routes
function authenticate(req, res, next) {
  const token = req.headers.authorization;
  if (!token || !sessions[token]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = sessions[token];
  next();
}

// Article CRUD (requires authentication)

// Create article
app.post('/articles', authenticate, (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }
  const article = {
    id: nextArticleId++,
    authorId: req.userId,
    title,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  articles.push(article);
  res.status(201).json(article);
});

// Get all articles
app.get('/articles', authenticate, (_req, res) => {
  res.json(articles);
});

// Get single article
app.get('/articles/:id', authenticate, (req, res) => {
  const article = articles.find(a => a.id === parseInt(req.params.id));
  if (!article) return res.status(404).json({ error: 'Article not found' });
  res.json(article);
});

// Update article
app.put('/articles/:id', authenticate, (req, res) => {
  const id = parseInt(req.params.id);
  const article = articles.find(a => a.id === id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  if (article.authorId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

  const { title, content } = req.body;
  article.title = title || article.title;
  article.content = content || article.content;
  article.updatedAt = new Date().toISOString();

  res.json(article);
});

// Delete article
app.delete('/articles/:id', authenticate, (req, res) => {
  const id = parseInt(req.params.id);
  const index = articles.findIndex(a => a.id === id);
  if (index === -1) return res.status(404).json({ error: 'Article not found' });
  if (articles[index].authorId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

  articles.splice(index, 1);
  res.status(204).send();
});

// Fallback route
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
