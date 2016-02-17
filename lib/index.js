"use strict";

var express = require('express');
var router = express.Router();
router.use(express.static('fiddle'));

module.exports = router;