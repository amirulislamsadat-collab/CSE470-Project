const db = require('../config/db');

exports.getNotes = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const q = (req.query.q || '').trim();
  try {
    let query = `SELECT * FROM notes WHERE user_id = ?`;
    const params = [req.session.user.id];
    if (q) {
      query += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    query += ' ORDER BY is_pinned DESC, updated_at DESC';
    const [notes] = await db.query(query, params);
    res.render('notes-list', { user: req.session.user, notes, q });
  } catch (err) {
    console.error('Notes list error:', err);
    req.session.error = 'Failed to load notes.';
    res.redirect('/dashboard');
  }
};

exports.getCreateNote = (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('notes-form', { user: req.session.user, note: null, formAction: '/notes/create', pageTitle: 'Create Note' });
};

exports.postCreateNote = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const { title, content } = req.body;
  if (!title || !title.trim()) {
    req.session.error = 'Note title is required.';
    return res.redirect('/notes/new');
  }
  try {
    await db.query(
      'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
      [req.session.user.id, title.trim(), (content || '').trim()]
    );
    req.session.success = 'Note created successfully!';
    res.redirect('/notes');
  } catch (err) {
    console.error('Create note error:', err);
    req.session.error = 'Failed to create note.';
    res.redirect('/notes/new');
  }
};

exports.getEditNote = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const [rows] = await db.query('SELECT * FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
    if (!rows.length) {
      req.session.error = 'Note not found.';
      return res.redirect('/notes');
    }
    res.render('notes-form', {
      user: req.session.user,
      note: rows[0],
      formAction: `/notes/edit/${req.params.id}`,
      pageTitle: 'Edit Note'
    });
  } catch (err) {
    console.error('Edit note form error:', err);
    req.session.error = 'Failed to load note.';
    res.redirect('/notes');
  }
};

exports.postEditNote = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const { title, content } = req.body;
  if (!title || !title.trim()) {
    req.session.error = 'Note title is required.';
    return res.redirect(`/notes/edit/${req.params.id}`);
  }
  try {
    await db.query(
      'UPDATE notes SET title = ?, content = ? WHERE id = ? AND user_id = ?',
      [title.trim(), (content || '').trim(), req.params.id, req.session.user.id]
    );
    req.session.success = 'Note updated successfully!';
    res.redirect('/notes');
  } catch (err) {
    console.error('Update note error:', err);
    req.session.error = 'Failed to update note.';
    res.redirect(`/notes/edit/${req.params.id}`);
  }
};

exports.togglePin = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    await db.query(
      'UPDATE notes SET is_pinned = 1 - is_pinned WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.user.id]
    );
    req.session.success = 'Note updated.';
  } catch (err) {
    console.error('Toggle pin error:', err);
    req.session.error = 'Failed to update note pin.';
  }
  res.redirect('/notes');
};

exports.deleteNote = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    await db.query('DELETE FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
    req.session.success = 'Note deleted.';
  } catch (err) {
    console.error('Delete note error:', err);
    req.session.error = 'Failed to delete note.';
  }
  res.redirect('/notes');
};
