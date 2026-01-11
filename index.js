"use strict";

require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const cookie_parser = require("cookie-parser");
const fs = require('fs');
const https = require('https');

const authRoutes = require('./routes/userRoutes');

const app = express();
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookie_parser());

app.use('/api/auth', authRoutes);

const dbConnData = {
    host: process.env.MONGO_HOST || '127.0.0.1',
    port: process.env.MONGO_PORT || 27017,
    database: process.env.MONGO_DATABASE || 'ProgTalk'
};


mongoose
    .connect(`mongodb://${dbConnData.host}:${dbConnData.port}/${dbConnData.database}`)
    .then(async (response) => {
        console.log(`Baza: "${response.connections[0].name}"`);
        const apiPort = process.env.PORT || 3000
        const apiHost = process.env.API_HOST || 'localhost';
        app.listen(apiPort, () => {
            console.log(`API: http://${apiHost}:${apiPort}`);
        });
    })
    .catch(error => {
        console.error('Błąd połączenia z serwerem MongoDB', error)
    });