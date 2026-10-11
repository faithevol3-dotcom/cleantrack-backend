const express = require("express");
const { getMyNotifications, markRead, markAllRead } = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect, allowRoles("customer"));
router.get("/", getMyNotifications);
router.put("/read-all", markAllRead);
router.put("/:id/read", markRead);

module.exports = router;
