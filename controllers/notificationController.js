const pool = require("../config/db");

// Creates a notification for each of this customer's pickups whose current status has no notification yet.
async function syncNotifications(customerId) {
  await pool.query(
    `INSERT INTO notifications (user_id, title, message, created_at)
     SELECT pr.customer_id,
            CONCAT('Pickup #', pr.id, ' is now ', REPLACE(pr.status, '_', ' ')),
            CONCAT('Your pickup request #', pr.id, ' is now ', REPLACE(pr.status, '_', ' '), '.'),
            pr.updated_at
     FROM pickup_requests pr
     WHERE pr.customer_id = ?
       AND pr.status IN ('assigned', 'on_the_way', 'collected', 'failed')
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.user_id = pr.customer_id
           AND n.title = CONCAT('Pickup #', pr.id, ' is now ', REPLACE(pr.status, '_', ' '))
       )`,
    [customerId]
  );
}

async function getMyNotifications(req, res) {
  try {
    await syncNotifications(req.user.id);
    const [rows] = await pool.query(
      "SELECT id, title, message, status, created_at, read_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC",
      [req.user.id]
    );
    const unread = rows.filter((row) => row.status === "unread").length;
    res.json({ notifications: rows, unread });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function markRead(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "A valid notification id is required." });
    }
    // Ownership check: the notification must belong to the logged-in customer.
    const [result] = await pool.query(
      "UPDATE notifications SET status = 'read', read_at = NOW() WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Notification not found." });
    }
    res.json({ message: "Notification marked as read." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function markAllRead(req, res) {
  try {
    await pool.query(
      "UPDATE notifications SET status = 'read', read_at = NOW() WHERE user_id = ? AND status = 'unread'",
      [req.user.id]
    );
    res.json({ message: "All notifications marked as read." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

module.exports = { getMyNotifications, markRead, markAllRead };
