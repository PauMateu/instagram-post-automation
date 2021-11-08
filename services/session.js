require("dotenv").config();
const { resolve } = require("path");
const { readFile, writeFile, access } = require('fs/promises');

let ig = null;

const save = async (data) => {
    await writeFile(
        resolve(__dirname, '../state.json'),
        JSON.stringify(data, null, 2), {
        encoding: 'utf-8',
    }).catch(console.error)
    return data;
}

const exists = async () => {
    console.log('checking if state json exists');
    return access(resolve(__dirname, '../state.json')).then(() => true).catch(() => false);
}

const load = async () => {
    console.log('loading state json');
    // here you would load the data
    let state = await readFile(
        resolve(__dirname, '../state.json'),
        { encoding: 'utf-8' }
    )
    try {
        return await JSON.parse(state);
    } catch (err) {
        console.log('error');
        return false;
    }
}

/**
 * @returns {boolean} `true` if the session is valid/exists - `false` if the session is invalid
 */
async function tryLoadSession() {
    console.log('trying to load the session');
    if (await exists()) {
        console.log('exists');
        try {
            let loaded = await load();
            console.log(loaded);
            await ig.state.deserialize(loaded);

            // try any request to check if the session is still valid
            let usr = await ig.account.currentUser();
            console.log('we got the session loaded correctly');
            return true;
        } catch (e) {
            console.log(e);
            console.log('error on doing the request');
            return false;
        }
    }
    return false;
}


exports.login = async (instagram) => {
    ig = instagram;
    // in your main function
    ig.state.generateDevice(process.env.INSTAGRAM_USERNAME)
    console.log('trying to login');
    ig.request.end$.subscribe(async () => {
        const serialized = await ig.state.serialize();
        delete serialized.constants;
        save(serialized);
    });

    await ig.simulate.preLoginFlow();
    if (!(await tryLoadSession())) {
        console.log('We havent got a session');
        // This call will provoke request.end$ stream
        await ig.account.login(process.env.INSTAGRAM_USERNAME, process.env.INSTAGRAM_PASSWORD);
        await ig.simulate.postLoginFlow()
        console.log('loggin succesful');
    }
};
