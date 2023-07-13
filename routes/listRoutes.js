const express = require("express");
const router = express.Router();
const {
  getLists,
  createList,
  updateList,
  deleteList,
  softDeleteList,
  undoSoftDeleteList,
  starList,
  searchLists,
  getOwnListById,
  getInfo,
  getOther,
} = require("../controller/listController");
const validateToken = require("../middleware/validationHandler");

router.use(validateToken);
router.route("/").get(getLists).post(createList);
router.route("/:id").put(updateList).delete(deleteList);
router.route("/delete/:id").put(softDeleteList);
router.route("/undelete/:id").put(undoSoftDeleteList);
router.route("/star/:id").put(starList);
router.route("/search").get(searchLists);
router.route("/own/:id").get(getOwnListById);
router.route("/info").get(getInfo);
router.route("/other").get(getOther);
module.exports = router;