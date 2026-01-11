"use strict";

require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const cookie_parser = require("cookie-parser");
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const passport = require('./passport');

const authRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const topicRoutes = require('./routes/topicRoutes');

const app = express();
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookie_parser());
app.use(passport.initialize());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/topics', topicRoutes);
app.use('/', () => {
    console.log("Kontrolny log");
    
})

const cert_keypath = path.join(__dirname, 'certificate', 'server.key');
const cert_certpath = path.join(__dirname, 'certificate', 'server.crt');

const tlsOptions = {
    key: fs.readFileSync(cert_keypath),
    cert: fs.readFileSync(cert_certpath)
};


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

        
        const https_port = process.env.HTTPS_PORT || 3443;


        const tlsOptions = {
            key: fs.readFileSync(cert_keypath),
            cert: fs.readFileSync(cert_certpath)
        };

        const httpsServ = https.createServer(tlsOptions, app);

        httpsServ.listen(https_port, () => {
            console.log(`API (https): https://localhost:${https_port}`);
        })

        http.createServer((req, res) => {
            const host = req.headers.host?.split(':')[0] || apiHost;
            res.writeHead(301, {location: `https://${host}:${https_port}${req.url}`});
            res.end();
        }).listen(apiPort, () => {
            console.log("Przekierowanie z http na https działa");
        })
    })
    .catch(error => {
        console.error('Błąd połączenia z serwerem MongoDB', error)
    });