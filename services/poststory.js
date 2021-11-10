const { StickerBuilder } = require("instagram-private-api/dist/sticker-builder");
const path = require("path");
const fs = require("fs");
const { getHeight } = require("jimp");
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
        default:
            break;
    }
}


