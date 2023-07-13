const express = require("express");
const router = express.Router();
const {
    getListById
} = require("../controller/listController");


router.route("/:id").get(getListById);

module.exports = router;