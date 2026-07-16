const db = require('../config/db');

exports.getTaskHub = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    res.render('tasks-hub', { user: req.session.user });
  } catch (err) {
    console.error('Hub error:', err);
    res.redirect('/dashboard');
  }
};

exports.getCreateTask = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const [categories] = await db.query('SELECT * FROM categories ORDER BY name');
    res.render('tasks-create', { user: req.session.user, categories });
  } catch (err) {
    console.error('Create form error:', err);
    res.redirect('/tasks/hub');
  }
};

exports.postCreateTask = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const { title, description, category_id, priority, difficulty, availability } = req.body;
  try {
    await db.query(
      `INSERT INTO tasks (user_id, category_id, title, description, priority, difficulty, availability, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [req.session.user.id, category_id || null, title, description || '', priority || 'medium', difficulty || 'normal', availability || 'flexible']
    );
    req.session.success = 'Task created successfully!';
    res.redirect('/tasks/view');
  } catch (err) {
    console.error('Create error:', err);
    req.session.error = 'Failed to create task.';
    res.redirect('/tasks/new');
  }
};

exports.getTaskList = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const [tasks] = await db.query(
      "SELECT * FROM tasks WHERE user_id = ? ORDER BY FIELD(status, 'pending', 'done') ASC, created_at DESC",
      [req.session.user.id]
    );
    const [categories] = await db.query('SELECT * FROM categories ORDER BY name');
    res.render('tasks-list', { user: req.session.user, tasks, categories });
  } catch (err) {
    console.error('Task view error:', err);
    res.redirect('/tasks/hub');
  }
};

exports.markDone = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    await db.query("UPDATE tasks SET status = 'done' WHERE id = ? AND user_id = ?", [req.params.id, req.session.user.id]);
    req.session.success = 'Task marked as done!';
  } catch (err) { req.session.error = 'Failed to complete task.'; }
  res.redirect('/tasks/view');
};

exports.deleteTask = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    await db.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
    req.session.success = 'Task deleted.';
  } catch (err) { req.session.error = 'Failed to delete task.'; }
  res.redirect('/tasks/view');
};
