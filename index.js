const express = require("express");
const app = express();
const Instagram = require("instagram-web-api");
const cron = require("node-cron")
const fs = require("fs");
const path = require("path");
const { resolve } = require("path");
const { login } = require("./services/session");
const { postbnb } = require("./services/postbnb.js");
const { followUsers } = require("./services/followUsers")
require("dotenv").config();
const { IgApiClient } = require('instagram-private-api');

const port = process.env.PORT || 4000;
const ig = new IgApiClient();

// cron.schedule("00 17 * * *", () => {
//     loginFunction('post');
// })

// cron.schedule("00 23 * * *", () => {
//     loginFunction('follow');
// })

app.get('/postbnb',async (req, res) => {
    console.log('Got request to post an airbnb');
    await login(ig);
    await postbnb(ig);
})

app.get('/followUsers',async (req, res) => {
    console.log('got request to follow user');
    await postbnb(ig);
})

app.listen(port, () => {
    console.log(`Listening on port ${port}...`)
    test();
})


let test = async () => {
    await login(ig);
    await postbnb(ig);
}