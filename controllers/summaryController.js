const pool = require("../config/db");

async function getMyPickupSummary(req, res) {
  try {
    // Every query filters on the logged-in customer, so nobody sees another customer's data.
    const customerId = req.user.id;

    const [statusRows] = await pool.query(
      "SELECT status, COUNT(*) AS count FROM pickup_requests WHERE customer_id = ? GROUP BY status",
      [customerId]
    );
    const byStatus = { pending: 0, assigned: 0, on_the_way: 0, collected: 0, failed: 0, cancelled: 0 };
    let total = 0;
    statusRows.forEach((row) => {
      byStatus[row.status] = Number(row.count);
      total += Number(row.count);
    });

    const [categoryRows] = await pool.query(
      "SELECT c.name, COUNT(*) AS count FROM pickup_requests r JOIN waste_categories c ON c.id = r.waste_category_id WHERE r.customer_id = ? GROUP BY c.name ORDER BY count DESC",
      [customerId]
    );

    const [lastRows] = await pool.query(
      "SELECT DATE_FORMAT(MAX(completed_at), '%Y-%m-%d') AS last_collected FROM pickup_requests WHERE customer_id = ? AND status = 'collected'",
      [customerId]
    );

    const [scheduleRows] = await pool.query(
      "SELECT COUNT(*) AS count FROM pickup_schedules WHERE customer_id = ? AND status = 'active'",
      [customerId]
    );

    res.json({
      summary: {
        total,
        byStatus,
        byCategory: categoryRows.map((row) => ({ name: row.name, count: Number(row.count) })),
        lastCollected: lastRows[0].last_collected,
        activeSchedules: Number(scheduleRows[0].count)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

module.exports = { getMyPickupSummary };
