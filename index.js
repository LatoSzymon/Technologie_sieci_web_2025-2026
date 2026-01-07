"use strict";

const mongoose = require("mongoose");
const express = require("express");
const morgan = require("morgan");

const app = express();
app.use(morgan("dev"));


