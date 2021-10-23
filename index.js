const express = require("express");
const app = express();
const Instagram = require("instagram-web-api");
const FileCookieStore = require("tough-cookie-filestore2")
const Jimp = require("jimp");
const sizeOf = require('image-size');
const cron = require("node-cron")
const fs = require("fs");
const path = require("path");
const { resolve } = require("path");
require("dotenv").config();

const port = process.env.PORT || 4000;
const cookieStore = new FileCookieStore("./cookies.json")

const getDirectories = source =>
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)

const getPictures = source =>
    fs.readdirSync(source, {withFileTypes: true})
    .filter(pic => path.extname(pic.name) ===".jpg")
    .map(picture => picture.name);

const getJSON = source =>
    fs.readdirSync(source, {withFileTypes: true})
    .filter(pic => path.extname(pic.name) ===".json")
    .map(picture => picture.name);

const deleteDirectory = source =>
    fs.rmSync(source, { recursive: true, force: true });


const resizeAndCropImage = async (imagePath) =>{
    let {width, height} = sizeOf(imagePath);
    console.log("----- PHOTO DIMENSIONS -----")
    console.log(`    - width:${width}`)
    console.log(`    - height:${height}`)
    console.log(`    - w/h:${width / height}`)
    console.log(`    - h/w:${height/ width}`)
    console.log("---------------------------")
    if ( width / height >= 1.91){
        //we have to adjust landscape ratio
        let newWidth = height * 1.90;
        let image = await Jimp.read(imagePath)
        await image
            .crop((width-newWidth)/2, 0, newWidth, height)
            .quality(100)
            .writeAsync(imagePath)
    }else if ( height / width > (1.25)){
        //we have to adjust portrait ratio   
        let newHeight = width*(1.24);
        let image = await Jimp.read(imagePath);
        await image.crop(0, (height-newHeight)/2, width, newHeight)
                .quality(100)
                .writeAsync(imagePath) 
    }

    let newSizes = sizeOf(imagePath);
    width = newSizes.width;
    height = newSizes.height;

    //check if dimensions are correct or we have to scale the image
    if(width / height >= 1 && width >= 1080){
        //we have a landscape image
        let image = await Jimp.read(imagePath);
        await image.resize(1080, Jimp.AUTO)
                .quality(100)
                .writeAsync(imagePath)
    }else if(height/width > 1 && height > 150){
        //we have a landscape image
        let image = await Jimp.read(imagePath);
        await image.resize(Jimp.AUTO, 150 )
                .quality(100)
                .writeAsync(imagePath)
    }
}
const createDescription = (airbnbInfo, descriptions)=>{
    let header = descriptions.headers[Math.floor(Math.random()*descriptions.headers.length)];
    let footer = descriptions.footers[Math.floor(Math.random()*descriptions.footers.length)];
    return `
${header}
.
🏡 ${airbnbInfo.title}
💰 ${airbnbInfo.price}/Night
📍 ${airbnbInfo.location} 
⭐ ${airbnbInfo.rating}
.
Check the link on our bio for the bnb url! 
Don't forget to follow us for more afordable bnbs!
${footer}`
}

const client = new Instagram(
    {
    username: process.env.INSTAGRAM_USERNAME,
    password: process.env.INSTAGRAM_PASSWORD,
    cookieStore
    },
    {
        language: "en-US"
    })

const instagramPostFunction = async (retry = true) =>{
    //Choose a folder and get the picture
    console.log("-Trying to get an Airbnb!")
    let directories = getDirectories(path.resolve(__dirname, "./airbnbs"));
    if(directories.length < 1){
        console.error("error: [ No more airbnbs to post, cancelling the job ]");
        return;
    }
    let dir = directories[0];
    try{
        let pictures = getPictures(path.resolve(__dirname, `./airbnbs/${dir}`));
        let json = getJSON(path.resolve(__dirname, `./airbnbs/${dir}`))[0];

        if(pictures.length < 1||json.length <1){
            console.log("error: [Couldn't find a photo or info from the bnb, deleting folder]");
            deleteDirectory(path.resolve(__dirname, `./airbnbs/${dir}`));
            instagramPostFunction(false);
            return;
        }
        console.log("  ✓ Airbnb obtanied succesfully!");
        console.log("-Trying to resize the airbnb Image")
        //resize crop it for the moment beeing, the first image
        try{
            await resizeAndCropImage(`./airbnbs/${dir}/${pictures[0]}`);
        }catch(e){
            console.log("error: [Couldn't resize bnb, choosing anotheone]");
            deleteDirectory(path.resolve(__dirname, `./airbnbs/${dir}`));
            instagramPostFunction(false);
            return;
        }
        console.log("  ✓ Airbnb  resized succesfully!");
        await setTimeout(()=>{}, 3000)
        //create description
        let rawairbnbInfo = fs.readFileSync(path.resolve(__dirname, `./airbnbs/${dir}/${json}`));
        let airbnbInfo = JSON.parse(rawairbnbInfo);
        let rawdescriptionJSON = fs.readFileSync(path.resolve(__dirname, `./descriptions.json`));
        let descriptionJSON = JSON.parse(rawdescriptionJSON);
        let rawHastagJSON = fs.readFileSync(path.resolve(__dirname, `./hastags.json`));
        let hastagJSON = JSON.parse(rawHastagJSON);

        let description = createDescription(airbnbInfo,descriptionJSON);
        //create hastag comment
        let hastags = hastagJSON[Math.floor(Math.random()*hastagJSON.length)];
        //post picture
        console.log(
`-------------------
Trying to post the bnb image with caption 
-------------------
${description}
-------------------
And hastags 
-------------------- 
${hastags} 
--------------------`);

        let sizes = sizeOf(path.resolve(__dirname, `./airbnbs/${dir}/${pictures[0]}`));
        width = sizes.width;
        height = sizes.height;

        await client.uploadPhoto({
            photo: `./airbnbs/${dir}/${pictures[0]}`,
            caption: description,
            post: "feed",
            sizes: [height, width]
        }).then(async (res) =>{
            //post a comment
            const media = res.media;
            console.log(`  ✓ IMAGE POSTED SUCCESFULLY!  check it out at:`);
            console.log(`      https://www.instagram.com/p/${media.code}`);
            console.log("-Trying to post hastag comment")

             await client.addComment({
                 mediaId: media.id,
                 text: hastags
                }).then(async ()=>{
                    //changing bio link
                    console.log("  ✓ Hastag posted succesfully!");
                    console.log("-Trying to update URL bio link")

                    await client.updateProfile(
                        {
                            biography: `🌴Awesome AIRBNBs you can afford!
                            ✉️ DM For features and business enquires`, // new bio
                            website: `https://www.airbnb.com/rooms/${airbnbInfo.id}`, // new website
                            name: "Best AirBnBs", // new name
                            email: process.env.INSTAGRAM_MAIL, // email from profile
                            username: process.env.INSTAGRAM_USERNAME, // username from profile
                            phoneNumber: process.env.INSTAGRAM_PHONE, // phone from profile
                            // gender: 0 // gender from profile
                        })
                        .then(()=>{
                        console.log("  ✓ Comment posted succesfully!");
                        console.log("-Trying to write the json file to /posted")
                        //save the bnb info to a new JSON
                        airbnbInfo.instagramLink = `https://www.instagram.com/p/${media.code}`;
                        airbnbInfo.mediaId = media.id;
                        fs.writeFile(path.resolve(__dirname, `./posted/${json}`), JSON.stringify(airbnbInfo), 'utf8', function (err) {
                            if (err) {
                                console.log("An error occured while writing JSON Object to File.");
                                return console.log(err);
                            }
                            console.log("  ✓ JSON file saved");
                            console.log("------ SESION ENDED ------");

                            //Delete the folder
                            deleteDirectory(path.resolve(__dirname, `./airbnbs/${dir}`));
                        });
                    })
   
                })
        })
    }catch(err){
        console.log("error: [we were not able to post the Airbnb for some reason] moving the folder to debug section\n ERROR:");
        console.log(err)
        fs.rename(
            path.resolve(__dirname, `./airbnbs/${dir}`), 
            path.resolve(__dirname, `./debug/${dir}`), 
                (err) => {
                if (err) {
                    console.log("error: Wasn't able to move the dir to debug section. Deleting directory").
                    deleteDirectory(path.resolve(__dirname, `./airbnbs/${dir}`));
                };
            });
    }
}
const loginFunction = async(action = "post", retry = false) =>{
    console.log("-Trying to Login..");
    await client
        .login()
        .then((res)=>{
            console.log("  ✓ Loggin Succesful!");
            switch (action) {
                case "post":
                    instagramPostFunction();
                    break;

                case "follow":
                    followUsers();
                    break;

                default:
                    break;
            }
        })
        .catch((err)=>{
            console.log("  -Loggin Failed!")
            console.log(err);
            //if it is the first time we are logging in, we want to retry the login 2 minutes after
            if(retry){
                console.log(
                    "  -!Deleting cookies, waiting 2 minutes, then logging in again and setting new cookie store"
                );
                fs.unlinkSync("./cookies.json");
                const newCookieStore = new FileCookieStore("./cookies.json");
                client = new Instagram(
                    {
                    username: process.env.INSTAGRAM_USERNAME,
                    password: process.env.INSTAGRAM_PASSWORD,
                    cookieStore: newCookieStore,
                    },
                    {
                    language: "en-US",
                    }
                );
                "  - Waiting 2 minutes to try to login again"
                //try to login again
                setTimeout(()=>{
                    loginFunction(action, false);
                },120000)
            }
    })
}

const followUsers = async () =>{
    console.log('-------- FOLLOW USERS SCRIPT STARTED --------');
    //get 20 random users
    console.log('-Trying to get a list of users');
    try{
        let usersToFollow = await getLastBnBFollowers();
        console.log("  ✓ List of users obtained succesfully")

        //Follow them one by one
        for(const usr of usersToFollow) {
            await Promise.all([
                followUsr(usr),
            ]);
        };
        console.log('-------- FOLLOW USERS SCRIPT  --------');
    }catch(e){
        console.log('[ERROR] error on obtaining the list of users to follow:');
        console.log(e);
        return;
    }
}

const getLastBnBFollowers = async () =>{
    // 639837 - airbnb id
    // 3703890771 - best airbnb id
    
    let airbnbFollowers = await client.getFollowers({ userId: '639837', first: 10 });
    let airbnbFollowersIds = await airbnbFollowers.data.map(usr=>usr.id);
    let bestBnbFollowers = await client.getFollowers({ userId: '3703890771', first: 10 });
    let bestBnbFollowersIds = await bestBnbFollowers.data.map(usr=>usr.id);

    return (airbnbFollowersIds.concat(bestBnbFollowersIds));
}


const followUsr = async (usrId) =>{
    //wait some random time between 2 and 7 minutes
    return new Promise(resolve => {
        let minToSleep = 2 +  Math.floor(Math.random() * 6);
        console.log(`-Sleeping for ${minToSleep} min`);
        setTimeout(async()=>{
            console.log(`-Trying to follow user ${usrId}`);
            await client.follow({ userId:usrId });
            console.log("  ✓ User followed succesfully")
            resolve();
        }, (minToSleep * 60 * 1000 ));
    })
}

cron.schedule("00 17 * * *", () => {
    loginFunction('post');
})

cron.schedule("00 23 * * *", () => {
    loginFunction('follow');
})

app.listen(port, ()=>{
    console.log(`Listening on port ${port}...`)
})
