const db = require('../config/db');

function normalizeReminder(body) {
  return {
    title: (body.title || '').trim(),
    message: (body.message || '').trim(),
    due_at: body.due_at
  };
}

exports.getReminders = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const [reminders] = await db.query(
      'SELECT * FROM reminders WHERE user_id = ? ORDER BY due_at ASC',
      [req.session.user.id]
    );
    res.render('reminders-list', { user: req.session.user, reminders });
  } catch (err) {
    console.error('Reminder list error:', err);
    req.session.error = 'Failed to load reminders.';
    res.redirect('/dashboard');
  }
};

exports.getCreateReminder = (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('reminders-form', { user: req.session.user, reminder: null, formAction: '/reminders/create', pageTitle: 'Create Reminder' });
};

exports.postCreateReminder = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const reminder = normalizeReminder(req.body);
  if (!reminder.title || !reminder.due_at) {
    req.session.error = 'Reminder title and due date/time are required.';
    return res.redirect('/reminders/new');
  }
  try {
    await db.query(
      'INSERT INTO reminders (user_id, title, message, due_at) VALUES (?, ?, ?, ?)',
      [req.session.user.id, reminder.title, reminder.message, reminder.due_at]
    );
    req.session.success = 'Reminder created successfully!';
    res.redirect('/reminders');
  } catch (err) {
    console.error('Create reminder error:', err);
    req.session.error = 'Failed to create reminder.';
    res.redirect('/reminders/new');
  }
};

exports.getEditReminder = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const [rows] = await db.query('SELECT * FROM reminders WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
    if (!rows.length) {
      req.session.error = 'Reminder not found.';
      return res.redirect('/reminders');
    }
    res.render('reminders-form', {
      user: req.session.user,
      reminder: rows[0],
      formAction: `/reminders/edit/${req.params.id}`,
      pageTitle: 'Edit Reminder'
    });
  } catch (err) {
    console.error('Edit reminder form error:', err);
    req.session.error = 'Failed to load reminder.';
    res.redirect('/reminders');
  }
};

exports.postEditReminder = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const reminder = normalizeReminder(req.body);
  if (!reminder.title || !reminder.due_at) {
    req.session.error = 'Reminder title and due date/time are required.';
    return res.redirect(`/reminders/edit/${req.params.id}`);
  }
  try {
    await db.query(
      'UPDATE reminders SET title = ?, message = ?, due_at = ? WHERE id = ? AND user_id = ?',
      [reminder.title, reminder.message, reminder.due_at, req.params.id, req.session.user.id]
    );
    req.session.success = 'Reminder updated successfully!';
    res.redirect('/reminders');
  } catch (err) {
    console.error('Update reminder error:', err);
    req.session.error = 'Failed to update reminder.';
    res.redirect(`/reminders/edit/${req.params.id}`);
  }
};

exports.deleteReminder = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    await db.query('DELETE FROM reminders WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
    req.session.success = 'Reminder deleted.';
  } catch (err) {
    console.error('Delete reminder error:', err);
    req.session.error = 'Failed to delete reminder.';
  }
  res.redirect('/reminders');
};
