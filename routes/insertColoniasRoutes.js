const express = require("express");
const { insertColoniaGeom } = require("../controllers/insertColoniasController");

const router = express.Router();

router.post("/insert-geom", insertColoniaGeom);

module.exports = router;
