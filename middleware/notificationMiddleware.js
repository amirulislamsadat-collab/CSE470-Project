const db = require('../config/db');

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function alarmMatchesToday(alarm, dayCode) {
  if (alarm.frequency === 'daily') return true;
  if (alarm.frequency === 'weekdays') return ['MO', 'TU', 'WE', 'TH', 'FR'].includes(dayCode);
  if (alarm.frequency === 'custom') {
    if (!alarm.days_of_week) return false;
    return alarm.days_of_week.split(',').includes(dayCode);
  }
  return false;
}

module.exports = async (req, res, next) => {
  res.locals.dueNotifications = [];

  if (!req.session.user) return next();

  try {
    const userId = req.session.user.id;
    const [dueReminders] = await db.query(
      `SELECT id, title, due_at
       FROM reminders
       WHERE user_id = ? AND due_at <= NOW() AND notified_at IS NULL
       ORDER BY due_at ASC
       LIMIT 5`,
      [userId]
    );

    const [alarms] = await db.query(
      `SELECT id, title, frequency, days_of_week, time_of_day, last_triggered_at
       FROM alarms
       WHERE user_id = ? AND is_enabled = 1`,
      [userId]
    );

    const now = new Date();
    const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dayCode = DAY_CODES[now.getDay()];
    const dueAlarms = [];

    for (const alarm of alarms) {
      if (!alarmMatchesToday(alarm, dayCode)) continue;
      const alarmTime = String(alarm.time_of_day || '').slice(0, 5);
      if (!alarmTime || alarmTime > nowHHMM) continue;

      const last = alarm.last_triggered_at ? new Date(alarm.last_triggered_at) : null;
      const alreadyTriggeredToday = last &&
        last.getFullYear() === now.getFullYear() &&
        last.getMonth() === now.getMonth() &&
        last.getDate() === now.getDate();

      if (alreadyTriggeredToday) continue;

      dueAlarms.push(alarm);
      await db.query('UPDATE alarms SET last_triggered_at = NOW() WHERE id = ? AND user_id = ?', [alarm.id, userId]);
    }

    res.locals.dueNotifications = [
      ...dueReminders.map(rem => ({ type: 'reminder', title: rem.title, time: rem.due_at })),
      ...dueAlarms.map(alarm => ({ type: 'alarm', title: alarm.title, time: alarm.time_of_day }))
    ];

    if (dueReminders.length) {
      const reminderIds = dueReminders.map(rem => rem.id);
      const placeholders = reminderIds.map(() => '?').join(',');
      await db.query(
        `UPDATE reminders
         SET notified_at = NOW()
         WHERE user_id = ? AND id IN (${placeholders})`,
        [userId].concat(reminderIds)
      );
    }
  } catch (err) {
    console.error('Notification middleware error:', err);
  }

  next();
};
