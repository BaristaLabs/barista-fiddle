
var express = require("express");

module.exports = baristaFiddle;
function baristaFiddle(options) {
    return express.static("fiddle");
}