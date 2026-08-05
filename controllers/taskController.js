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
    res.render('tasks-create', {
      user: req.session.user,
      categories,
      task: null,
      formAction: '/tasks/create',
      pageTitle: 'Create New Task',
      submitLabel: 'Save Task'
    });
  } catch (err) {
    console.error('Create form error:', err);
    res.redirect('/tasks/hub');
  }
};

exports.getEditTask = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const [taskResult, categoriesResult] = await Promise.all([
      db.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]),
      db.query('SELECT * FROM categories ORDER BY name')
    ]);
    const task = taskResult[0][0];
    const categories = categoriesResult[0];

    if (!task) {
      req.session.error = 'Task not found.';
      return res.redirect('/tasks/view');
    }

    res.render('tasks-create', {
      user: req.session.user,
      categories,
      task,
      formAction: `/tasks/edit/${req.params.id}`,
      pageTitle: 'Edit Task',
      submitLabel: 'Update Task'
    });
  } catch (err) {
    console.error('Edit form error:', err);
    req.session.error = 'Failed to load task.';
    res.redirect('/tasks/view');
  }
};

exports.postCreateTask = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const { title, description, category_id, priority, difficulty, availability } = req.body;
  if (!title || !title.trim()) {
    req.session.error = 'Task title is required.';
    return res.redirect('/tasks/new');
  }
  try {
    await db.query(
      `INSERT INTO tasks (user_id, category_id, title, description, priority, difficulty, availability, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [req.session.user.id, category_id || null, title.trim(), description || '', priority || 'medium', difficulty || 'normal', availability || 'flexible']
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
      `SELECT t.*, c.name AS category_name
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ?
       ORDER BY FIELD(t.status, 'pending', 'done') ASC, t.created_at DESC`,
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

exports.postEditTask = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const { title, description, category_id, priority, difficulty, availability, status } = req.body;
  if (!title || !title.trim()) {
    req.session.error = 'Task title is required.';
    return res.redirect(`/tasks/edit/${req.params.id}`);
  }

  try {
    const [result] = await db.query(
      `UPDATE tasks
       SET category_id = ?, title = ?, description = ?, priority = ?, difficulty = ?, availability = ?, status = ?
       WHERE id = ? AND user_id = ?`,
      [
        category_id || null,
        title.trim(),
        description || '',
        priority || 'medium',
        difficulty || 'normal',
        availability || 'flexible',
        status || 'pending',
        req.params.id,
        req.session.user.id
      ]
    );

    if (!result.affectedRows) {
      req.session.error = 'Task not found.';
      return res.redirect('/tasks/view');
    }

    req.session.success = 'Task updated successfully!';
    res.redirect('/tasks/view');
  } catch (err) {
    console.error('Edit task error:', err);
    req.session.error = 'Failed to update task.';
    res.redirect(`/tasks/edit/${req.params.id}`);
  }
};
