const express = require('express');
const session = require('express-session');
const path    = require('path');
const db      = require('./config/db');

const authRoutes      = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const taskRoutes      = require('./routes/taskRoutes');

const app  = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'alms-secret-key-470',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use((req, res, next) => {
  res.locals.user    = req.session.user    || null;
  res.locals.success = req.session.success || null;
  res.locals.error   = req.session.error   || null;
  delete req.session.success;
  delete req.session.error;
  next();
});

app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/', taskRoutes);

app.get('/', (req, res) => {
  if (req.session.user) {
    if (req.session.user.setup_completed != 1) return res.redirect('/setup');
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

async function initDB() {
  try {
    // Drop in safe dependency order
    await db.query('DROP TABLE IF EXISTS tasks');
    await db.query('DROP TABLE IF EXISTS user_modules');
    await db.query('DROP TABLE IF EXISTS users');
    await db.query('DROP TABLE IF EXISTS modules');
    await db.query('DROP TABLE IF EXISTS roles');
    await db.query('DROP TABLE IF EXISTS categories');

    // Create roles
    await db.query(`
      CREATE TABLE roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      INSERT INTO roles (id, name, description) VALUES
      (1, 'Student', 'Academic learner managing coursework, study schedules, and campus life'),
      (2, 'Professional', 'Working professional balancing career tasks, meetings, and personal growth'),
      (3, 'Freelancer', 'Independent worker managing clients, projects, deadlines, and invoicing')
    `);

    // Create users
    await db.query(`
      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role_id INT DEFAULT NULL,
        setup_completed TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
      )
    `);

    // Create modules
    await db.query(`
      CREATE TABLE modules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(50) DEFAULT 'fas fa-cube',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      INSERT INTO modules (id, name, slug, description, icon) VALUES
      (1, 'Task Manager',     'tasks',    'Create, organize, and track your daily tasks and to-dos',            'tasks'),
      (2, 'Study Planner',    'study',    'Plan study sessions, track coursework, and manage academic deadlines','book'),
      (3, 'Finance Tracker',  'finance',  'Monitor expenses, income, and maintain a personal budget',           'wallet'),
      (4, 'Health & Wellness','health',   'Track fitness goals, water intake, and wellness habits',             'heart'),
      (5, 'Project Board',    'projects', 'Manage projects with kanban boards and milestone tracking',          'project'),
      (6, 'Personal Journal', 'journal',  'Write daily reflections, mood tracking, and personal notes',        'pen')
    `);

    // Create user_modules
    await db.query(`
      CREATE TABLE user_modules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        module_id INT NOT NULL,
        is_enabled TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_module (user_id, module_id),
        FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
      )
    `);

    // Create categories
    await db.query(`
      CREATE TABLE categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        color VARCHAR(7) DEFAULT '#6366f1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      INSERT INTO categories (id, name, color) VALUES
      (1, 'Work',     '#ef4444'),
      (2, 'Personal', '#3b82f6'),
      (3, 'Study',    '#8b5cf6'),
      (4, 'Health',   '#10b981'),
      (5, 'Finance',  '#f59e0b'),
      (6, 'Other',    '#6b7280')
    `);

    // Create tasks
    await db.query(`
      CREATE TABLE tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        category_id INT DEFAULT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(10) DEFAULT 'medium',
        difficulty VARCHAR(20) DEFAULT 'normal',
        availability VARCHAR(20) DEFAULT 'flexible',
        status VARCHAR(10) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `);

    console.log('✅ Database: All 6 tables created and seeded successfully.');
  } catch (err) {
    console.error('!!! DB INIT CRASH !!! ->', err.message);
  }
}

app.listen(PORT, async () => {
  console.log(`✅ ALMS server running → http://localhost:${PORT}`);
  await initDB();
});
