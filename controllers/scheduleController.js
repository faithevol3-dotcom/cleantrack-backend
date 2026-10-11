const pool = require("../config/db");

const frequencies = ["weekly", "biweekly", "monthly"];

function toIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

// The next pickup is the first date on the repeating pattern that is today or later.
function nextPickupDate(startDate, frequency) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(startDate + "T00:00:00");
  let guard = 0;
  while (next < today && guard < 2000) {
    if (frequency === "monthly") next.setMonth(next.getMonth() + 1);
    else next.setDate(next.getDate() + (frequency === "weekly" ? 7 : 14));
    guard++;
  }
  return toIso(next);
}

async function createSchedule(req, res) {
  try {
    const { location_id, waste_category_id, frequency, start_date, notes } = req.body;

    if (!location_id || !waste_category_id || !frequency || !start_date) {
      return res.status(400).json({ message: "Location, waste category, frequency and start date are required." });
    }
    if (!frequencies.includes(frequency)) {
      return res.status(400).json({ message: "Frequency must be weekly, biweekly or monthly." });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date) || isNaN(new Date(start_date).getTime())) {
      return res.status(400).json({ message: "Start date must be a valid date (YYYY-MM-DD)." });
    }
    if (start_date < toIso(new Date())) {
      return res.status(400).json({ message: "Start date cannot be in the past." });
    }
    const cleanNotes = (notes || "").trim();
    if (cleanNotes.length > 200) {
      return res.status(400).json({ message: "Notes must be 200 characters or fewer." });
    }

    // Ownership check: the location must belong to the logged-in customer.
    const [locations] = await pool.query(
      "SELECT id FROM customer_locations WHERE id = ? AND user_id = ?",
      [location_id, req.user.id]
    );
    if (locations.length === 0) {
      return res.status(404).json({ message: "Location not found." });
    }

    const [categories] = await pool.query(
      "SELECT id FROM waste_categories WHERE id = ? AND status = 'active'",
      [waste_category_id]
    );
    if (categories.length === 0) {
      return res.status(404).json({ message: "Waste category not found." });
    }

    const [result] = await pool.query(
      "INSERT INTO pickup_schedules (customer_id, location_id, waste_category_id, frequency, start_date, notes) VALUES (?, ?, ?, ?, ?, ?)",
      [req.user.id, location_id, waste_category_id, frequency, start_date, cleanNotes || null]
    );
    res.status(201).json({ message: "Recurring pickup schedule created.", id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function getMySchedules(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT s.id, s.frequency, DATE_FORMAT(s.start_date, '%Y-%m-%d') AS start_date, s.notes, s.status, l.location_name, c.name AS category_name FROM pickup_schedules s JOIN customer_locations l ON l.id = s.location_id JOIN waste_categories c ON c.id = s.waste_category_id WHERE s.customer_id = ? ORDER BY s.created_at DESC",
      [req.user.id]
    );
    const schedules = rows.map((row) => ({
      ...row,
      next_pickup_date: nextPickupDate(row.start_date, row.frequency)
    }));
    res.json({ schedules });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function updateScheduleStatus(req, res) {
  try {
    const { status } = req.body;
    if (!["active", "paused"].includes(status)) {
      return res.status(400).json({ message: "Status must be active or paused." });
    }
    const [found] = await pool.query(
      "SELECT id FROM pickup_schedules WHERE id = ? AND customer_id = ?",
      [req.params.id, req.user.id]
    );
    if (found.length === 0) {
      return res.status(404).json({ message: "Schedule not found." });
    }
    await pool.query("UPDATE pickup_schedules SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ message: "Schedule updated." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

async function deleteSchedule(req, res) {
  try {
    const [result] = await pool.query(
      "DELETE FROM pickup_schedules WHERE id = ? AND customer_id = ?",
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Schedule not found." });
    }
    res.json({ message: "Schedule deleted." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

module.exports = { createSchedule, getMySchedules, updateScheduleStatus, deleteSchedule };
