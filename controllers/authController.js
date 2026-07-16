const bcrypt = require('bcryptjs');
const db     = require('../config/db');

exports.getLogin = (req, res) => res.render('login');

exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) { req.session.error = 'Invalid email or password.'; return res.redirect('/login'); }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) { req.session.error = 'Invalid email or password.'; return res.redirect('/login'); }

    let roleName = 'Member';
    if (user.role_id) {
      const [r] = await db.query('SELECT name FROM roles WHERE id = ?', [user.role_id]);
      if (r.length) roleName = r[0].name;
    }
    req.session.user = { id: user.id, name: user.name, email: user.email, role: roleName, role_id: user.role_id, setup_completed: user.setup_completed };
    return res.redirect(user.setup_completed ? '/dashboard' : '/setup');
  } catch (err) {
    console.error('!!! LOGIN CRASH !!!! ->', err);
    req.session.error = 'Login failed. Please try again.';
    res.redirect('/login');
  }
};

exports.getRegister = (req, res) => res.render('register');

exports.postRegister = async (req, res) => {
  const { full_name, email, password, confirm_password } = req.body;
  if (!full_name || !email || !password) { req.session.error = 'All fields are required.'; return res.redirect('/register'); }
  if (password !== confirm_password) { req.session.error = 'Passwords do not match.'; return res.redirect('/register'); }
  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) { req.session.error = 'An account with that email already exists.'; return res.redirect('/register'); }
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [full_name, email, hashed]);
    req.session.user = { id: result.insertId, name: full_name, email, role: 'Member', role_id: null, setup_completed: 0 };
    req.session.success = "Account created! Let's set up your workspace.";
    res.redirect('/setup');
  } catch (err) {
    console.error('!!! REGISTRATION CRASH ERROR LOG !!! ->', err);
    req.session.error = 'Registration failed: ' + err.message;
    res.redirect('/register');
  }
};

exports.logout = (req, res) => { req.session.destroy(); res.redirect('/login'); };
