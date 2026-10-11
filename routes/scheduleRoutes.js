const express = require("express");
const { createSchedule, getMySchedules, updateScheduleStatus, deleteSchedule } = require("../controllers/scheduleController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect, allowRoles("customer"));
router.post("/", createSchedule);
router.get("/my-schedules", getMySchedules);
router.put("/:id/status", updateScheduleStatus);
router.delete("/:id", deleteSchedule);

module.exports = router;
