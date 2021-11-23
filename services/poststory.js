const { StickerBuilder } = require("instagram-private-api/dist/sticker-builder");
const path = require("path");
const fs = require("fs");
var https = require('https');
const { getHeight } = require("jimp");
const fetch = require('node-fetch');
let ig = null;

/**
 *  You can move and rotate stickers by using one of these methods:
 *  center()
 *  rotateDeg(180) rotates 180°
 *  scale(0.5) scales the sticker to 1/2 of it's size
 *  moveForward() moves the sticker in front
 *  moveBackwards() moves the sticker in the background
 *  right() aligns the sticker to the right
 *  left() aligns the sticker to the left
 *  top() aligns the sticker to the top
 *  bottom() aligns the sticker to the bottom
 *
 *  All of these are chainable e.g.:
 *  StickerBuilder.hashtag({ tagName: 'tag' }).scale(0.5).rotateDeg(90).center().left()
 *  You can also set the position and size like this:
 *  StickerBuilder.hashtag({
 *     tagName: 'insta',
 *     width: 0.5,
 *     height: 0.5,
 *     x: 0.5,
 *     y: 0.5,
 *   })
 */
var download = function (url, dest) {
    return new Promise( resolve => {
        var filestream = fs.createWriteStream(dest);
        var request = https.get(url, function (response) {
            response.pipe(filestream);
            filestream.on('finish', function () {
                filestream.close(()=>{resolve(true)});  // close() is async, call cb after close completes.
            });
        }).on('error', function (err) { // Handle errors
            fs.unlink(dest); // Delete the file async. (But we don't check the result)
            console.log(err);
            resolve(false);
        });
    })
    
};

const getJSON = source =>
    fs.readdirSync(source, { withFileTypes: true })
        .filter(pic => path.extname(pic.name) === ".json")
        .map(picture => picture.name);

let generateStoryImage = async (dir) => {
    return "https://glitterlycdn.com/Story_1637608792464.jpeg";
    let json = await getJSON(path.resolve(__dirname, `../airbnbs/${dir}`))[0];
    let rawairbnbInfo = fs.readFileSync(path.resolve(__dirname, `../airbnbs/${dir}/${json}`));
    let airbnbInfo = await JSON.parse(rawairbnbInfo);
    let imageUrl = airbnbInfo.imageUrl;
    if (!imageUrl)
        return false;

    const template_id = '8cd2fd3-3d2-ce0a-bf7c-a4e8164154'
    const changes = [
        {
            layer: 'Image',
            url: imageUrl,
        },
    ]

    const res = await fetch('https://www.glitterlyapi.com/image', {
        method: 'POST',
        body: JSON.stringify({ template_id, changes }),
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.GLITTERY_API_KEY_1,
        },
    })
    const data = await res.json()
    console.log(data);
    if (data && data.url) {
        console.log(imageUrl);
        return data.url
    }
    return false;
}

let instagramPostFirstStory = async (dir) => {
    let generatedImage = await generateStoryImage(dir);
    console.log(generatedImage);
    if (!generatedImage){
        console.log("Could not generate any image");
        return false;
    }
    let filepath = await path.resolve(__dirname, `../airbnbs/${dir}/story.jpg`);
    console.log(filepath);

    let downloadResponse = await download(generatedImage, filepath);

    console.log(downloadResponse);
    if(!downloadResponse){
        console.log("we havent got any download response")
        return false;
    }

    console.log(filepath);
    let file = await fs.readFileSync(filepath);
    let storyresult = await ig.publish.story({file})
    console.log(storyresult);
}

instagramPostQuizFunction = async (dir) => {
    let file = await fs.readFileSync(path.resolve(__dirname, `../airbnbs/${dir}/${dir}.jpg`));
    let storyresult = await ig.publish.story({
        file,
        stickerConfig: new StickerBuilder()
            .add(
                StickerBuilder.quiz({
                    question: 'How much does it cost?',
                    options: ['150$', '130$', '200$', '350$'],
                    correctAnswer: 1,
                    width: 0.18,
                    height: 0.3
                }).center()
            )
            .build(),
    })
}

instagramPostStoryFunction = async (dir) => {
    console.log('posting post');
    let file = await fs.readFileSync(path.resolve(__dirname, `../airbnbs/${dir}/${dir}.jpg`));
    let storyresult = await ig.publish.story({
        file,
        caption: "check this bnb out!",
        stickerConfig: new StickerBuilder()
            .add(StickerBuilder.attachmentFromMedia((await ig.feed.timeline().items())[0]).center().scale(0.3))
            .build(),
    })
}

exports.postStory = async (instagram, dir, type) => {
    ig = instagram;
    console.log(type);
    switch (type) {
        case "post":
            instagramPostStoryFunction(dir)
            break;
        case "quiz":
            instagramPostQuizFunction(dir)
            break;
        case "first":
            await instagramPostFirstStory(dir);
            console.log("finishing");            
            break;
        default:
            break;
    }
}


