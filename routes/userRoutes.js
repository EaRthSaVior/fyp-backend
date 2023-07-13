const express = require("express");
const {
  registerUser,
  currentUser,
  loginUser,
  updateUser,
  addRecent,
  toggleFavorite,
} = require("../controller/userController");
const validateToken = require("../middleware/validationHandler");

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/current", validateToken, currentUser);
router.put("/update",validateToken, updateUser);
router.put("/addRecent",validateToken, addRecent);
router.put("/toggleFavorite/:id",validateToken, toggleFavorite);

module.exports = router;