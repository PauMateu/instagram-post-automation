const path = require("path");
const fs = require("fs");
const Jimp = require("jimp");
const sizeOf = require('image-size');

let ig = null;

const getDirectories = source =>
    fs.readdirSync(source, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

const getPictures = source =>
    fs.readdirSync(source, { withFileTypes: true })
        .filter(pic => path.extname(pic.name) === ".jpg")
        .map(picture => picture.name);

const getJSON = source =>
    fs.readdirSync(source, { withFileTypes: true })
        .filter(pic => path.extname(pic.name) === ".json")
        .map(picture => picture.name);

const deleteDirectory = source =>
    fs.rmSync(source, { recursive: true, force: true });

const resizeAndCropImage = async (imagePath) => {
    let { width, height } = sizeOf(imagePath);
    console.log("----- PHOTO DIMENSIONS -----")
    console.log(`    - width:${width}`)
    console.log(`    - height:${height}`)
    console.log(`    - w/h:${width / height}`)
    console.log(`    - h/w:${height / width}`)
    console.log("---------------------------")
    if (width / height >= 1.91) {
        //we have to adjust landscape ratio
        let newWidth = height * 1.90;
        let image = await Jimp.read(imagePath)
        await image
            .crop((width - newWidth) / 2, 0, newWidth, height)
            .quality(100)
            .writeAsync(imagePath)
    } else if (height / width > (1.25)) {
        //we have to adjust portrait ratio   
        let newHeight = width * (1.24);
        let image = await Jimp.read(imagePath);
        await image.crop(0, (height - newHeight) / 2, width, newHeight)
            .quality(100)
            .writeAsync(imagePath)
    }

    let newSizes = sizeOf(imagePath);
    width = newSizes.width;
    height = newSizes.height;

    //check if dimensions are correct or we have to scale the image
    if (width / height >= 1 && width >= 1080) {
        //we have a landscape image
        let image = await Jimp.read(imagePath);
        await image.resize(1080, Jimp.AUTO)
            .quality(100)
            .writeAsync(imagePath)
    } else if (height / width > 1 && height > 1080) {
        //we have a landscape image
        let image = await Jimp.read(imagePath);
        await image.resize(Jimp.AUTO, 1080)
            .quality(100)
            .writeAsync(imagePath)
    }
}



const createDescription = (airbnbInfo, descriptions) => {
    let header = descriptions.headers[Math.floor(Math.random() * descriptions.headers.length)];
    let footer = descriptions.footers[Math.floor(Math.random() * descriptions.footers.length)];
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

const instagramPostFunction = async (retry = true) => {
    //Choose a folder and get the picture
    console.log("-Trying to get an Airbnb!")
    console.log(path.resolve(__dirname, "../airbnbs"));
    let directories = await getDirectories(path.resolve(__dirname, "../airbnbs"));
    console.log(directories);
    if (directories.length < 1) {
        console.error("error: [ No more airbnbs to post, cancelling the job ]");
        return;
    }

    let dir = directories[0];

    try {
        let pictures = await getPictures(path.resolve(__dirname, `../airbnbs/${dir}`));
        let json = await getJSON(path.resolve(__dirname, `../airbnbs/${dir}`))[0];

        if (pictures.length < 1 || json.length < 1) {
            console.log("error: [Couldn't find a photo or info from the bnb, deleting folder]");
            await deleteDirectory(path.resolve(__dirname, `../airbnbs/${dir}`));
            instagramPostFunction(false);
            return;
        }
        console.log("  ✓ Airbnb obtanied succesfully!");
        console.log("-Trying to resize the airbnb Image");
        //resize crop it for the moment beeing, the first image
        for(const picture of pictures) {
            try {
                await resizeAndCropImage(path.resolve(__dirname, `../airbnbs/${dir}/${picture}`));
            } catch (e) {
                console.log(e)
                console.log("error: [Couldn't resize bnb, choosing anotheone]");
                await deleteDirectory(path.resolve(__dirname, `../airbnbs/${dir}`));
                instagramPostFunction(false);
                return;
            }
        };

        console.log("  ✓ Airbnb  resized succesfully!");
        await setTimeout(() => { }, 3000)
        //create description
        let rawairbnbInfo = fs.readFileSync(path.resolve(__dirname, `../airbnbs/${dir}/${json}`));
        let airbnbInfo = await JSON.parse(rawairbnbInfo);
        let rawdescriptionJSON = fs.readFileSync(path.resolve(__dirname, `../descriptions.json`));
        let descriptionJSON = await JSON.parse(rawdescriptionJSON);
        let rawHastagJSON = fs.readFileSync(path.resolve(__dirname, `../hastags.json`));
        let hastagJSON =await  JSON.parse(rawHastagJSON);

        let description = await createDescription(airbnbInfo, descriptionJSON);
        //create hastag comment
        let hastags = hastagJSON[Math.floor(Math.random() * hastagJSON.length)];
        //post picture
        console.log(`-------------------\nTrying to post the bnb image with caption\n-------------------\n${description}\n-------------------\nAnd hastags\n--------------------\n${hastags}\n--------------------`);
        let publishResult = null;
        try {
            if(pictures.length === 1){
                publishResult = await ig.publish.photo({
                    file: await fs.readFileSync(path.resolve(__dirname, `../airbnbs/${dir}/${pictures[0]}`)),
                    caption: description,
                });
            }else{
                let items = [];
                for (const picture of pictures) {
                    let picPath = await fs.readFileSync(path.resolve(__dirname, `../airbnbs/${dir}/${picture}`))
                    items.push({file: picPath})
                };
                publishResult = await ig.publish.album({
                    items: items,
                    caption: description,
                });
            }
            await setTimeout(()=>{},3000);

            console.log(`  ✓ IMAGE POSTED SUCCESFULLY!  check it out at:`);
            console.log(`      https://www.instagram.com/p/${publishResult.media.code}`);
            console.log("-Trying to post hastag comment")

            const commentResult = await ig.media.comment({
                mediaId: publishResult.media.id,
                text: hastags
            })

            console.log("  ✓ Hastag posted succesfully!");
            console.log("-Trying to update URL bio link")

            let currentUser = await ig.account.currentUser();

            const updateProfileResult = await ig.account.editProfile({
                external_url: `https://www.airbnb.com/rooms/${airbnbInfo.id}`,
                gender: currentUser.gender,
                phone_number: currentUser.phone_number,
                username: currentUser.username,
                first_name: "Best AirBnBs",
                biography: currentUser.biography,
                email: currentUser.email,
            })
            console.log("  ✓ bio updated succesfully!");
            console.log("-Trying to write the json file to /posted")
            //save the bnb info to a new JSON
            airbnbInfo.instagramLink = `https://www.instagram.com/p/${publishResult.media.code}`;
            airbnbInfo.mediaId = publishResult.media.id;
            fs.writeFile(path.resolve(__dirname, `../posted/${json}`), JSON.stringify(airbnbInfo), 'utf8', function (err) {
                if (err) {
                    console.log("An error occured while writing JSON Object to File.");
                    return console.log(err);
                }
                console.log("  ✓ JSON file saved");
                console.log("------ SESION ENDED ------");

                //Delete the folder
                deleteDirectory(path.resolve(__dirname, `../airbnbs/${dir}`));
            });
        } catch (e) {
            console.log("error: [we were not able to post the Airbnb for some reason] moving the folder to debug section\n ERROR:");
            console.log(e)
            fs.rename(
                path.resolve(__dirname, `../airbnbs/${dir}`),
                path.resolve(__dirname, `../debug/${dir}`),
                (err) => {
                    if (err) {
                        console.log("error: Wasn't able to move the dir to debug section. Deleting directory").
                        deleteDirectory(path.resolve(__dirname, `../airbnbs/${dir}`));
                    };
                });
        }
    } catch (e) {
        console.log("some error occurred");
        console.log(e)
    }
}

exports.postbnb = async (instagram) =>{
    ig = instagram;
    instagramPostFunction();
}