
const express = require("express");
const { updateColoniaGeom } = require("../controllers/updateColoniasController");

const router = express.Router();

router.get("/update-geom", updateColoniaGeom);

module.exports = router;
