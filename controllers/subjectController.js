const db = require('../config/db');

exports.getSubjects = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const [subjects] = await db.query(
      'SELECT * FROM subjects WHERE user_id = ? ORDER BY name ASC',
      [req.session.user.id]
    );
    res.render('subjects-list', { user: req.session.user, subjects });
  } catch (err) {
    console.error('Subject list error:', err);
    req.session.error = 'Failed to load subjects.';
    res.redirect('/dashboard');
  }
};

exports.getCreateSubject = (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('subjects-form', { user: req.session.user, subject: null, formAction: '/subjects/create', pageTitle: 'Create Subject' });
};

exports.postCreateSubject = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const name = (req.body.name || '').trim();
  const code = (req.body.code || '').trim();
  const instructor = (req.body.instructor || '').trim();
  if (!name) {
    req.session.error = 'Subject name is required.';
    return res.redirect('/subjects/new');
  }

  try {
    await db.query(
      'INSERT INTO subjects (user_id, name, code, instructor) VALUES (?, ?, ?, ?)',
      [req.session.user.id, name, code || null, instructor || null]
    );
    req.session.success = 'Subject created successfully!';
    res.redirect('/subjects');
  } catch (err) {
    console.error('Create subject error:', err);
    req.session.error = 'Failed to create subject.';
    res.redirect('/subjects/new');
  }
};

exports.getEditSubject = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const [rows] = await db.query('SELECT * FROM subjects WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
    if (!rows.length) {
      req.session.error = 'Subject not found.';
      return res.redirect('/subjects');
    }
    res.render('subjects-form', {
      user: req.session.user,
      subject: rows[0],
      formAction: `/subjects/edit/${req.params.id}`,
      pageTitle: 'Edit Subject'
    });
  } catch (err) {
    console.error('Edit subject form error:', err);
    req.session.error = 'Failed to load subject.';
    res.redirect('/subjects');
  }
};

exports.postEditSubject = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const name = (req.body.name || '').trim();
  const code = (req.body.code || '').trim();
  const instructor = (req.body.instructor || '').trim();
  if (!name) {
    req.session.error = 'Subject name is required.';
    return res.redirect(`/subjects/edit/${req.params.id}`);
  }

  try {
    await db.query(
      'UPDATE subjects SET name = ?, code = ?, instructor = ? WHERE id = ? AND user_id = ?',
      [name, code || null, instructor || null, req.params.id, req.session.user.id]
    );
    req.session.success = 'Subject updated successfully!';
    res.redirect('/subjects');
  } catch (err) {
    console.error('Update subject error:', err);
    req.session.error = 'Failed to update subject.';
    res.redirect(`/subjects/edit/${req.params.id}`);
  }
};

exports.deleteSubject = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    await db.query('DELETE FROM subjects WHERE id = ? AND user_id = ?', [req.params.id, req.session.user.id]);
    req.session.success = 'Subject deleted.';
  } catch (err) {
    console.error('Delete subject error:', err);
    req.session.error = 'Failed to delete subject.';
  }
  res.redirect('/subjects');
};
