const express = require("express");
const app = express();
const Instagram = require("instagram-web-api");
const FileCookieStore = require("tough-cookie-filestore2")
const Jimp = require("jimp");
const sizeOf = require('image-size');

require("dotenv").config();

const port = process.env.PORT || 4000;

const cookieStore = new FileCookieStore("./cookies.json")

const client = new Instagram(
    {
    username: process.env.INSTAGRAM_USERNAME,
    password: process.env.INSTAGRAM_PASSWORD,
    cookieStore
    },
    {
        language: "en-US"
    })

const instagramPostFunction = async () =>{
    await client.uploadPhoto({
        phot: "./photo.jpg",
        caption: "caption",
        post: "feed"
    }).then(async (res) =>{
        const media = res.media;
        console.log(`https://www.instagram.com/p/${media.code}`);
         await client.addComment({
             mediaId: media.id,
             text: "hastags"
         })
    })
}
const loginFunction = async() =>{
    console.log("Loggin in..");
    await client.login().then(()=>{
        console.log("Loggin Succesful!");
        instagramPostFunction();
    }).catch((err)=>{
        console.log("Loggin Failed!")
        console.log(err);
    })
}

// loginFunction();

app.listen(port, ()=>{
    console.log(`Listening on port ${port}...`)
})

const resizeAndCropImage = async (imagePath) =>{
    let {width, height} = sizeOf(imagePath);

    if ( width / height > 1.91){
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

resizeAndCropImage("./testVertical.jpg")