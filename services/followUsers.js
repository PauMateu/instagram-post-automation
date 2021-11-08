

let ig = null;

const followRoutine = async () =>{
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


const followUsr = async (usrId) =>{
    //wait some random time between 2 and 7 minutes
    return new Promise(resolve => {
        let minToSleep = 2 +  Math.floor(Math.random() * 6);
        console.log(`-Sleeping for ${minToSleep} min`);
        setTimeout(async()=>{
            console.log(`-Trying to follow user ${usrId}`);
            let follow = await ig.friendship.create(usrId);
            console.log(follow);
            console.log("  ✓ User followed succesfully")
            resolve();
        }, (minToSleep * 10 * 1000 ));
    })
}


const getLastBnBFollowers = async () =>{
    // 639837 - airbnb id
    // 3703890771 - best airbnb id
    const bnbFollowers = ig.feed.accountFollowers(639837);
    const bnbresponse = await bnbFollowers.items();
    const bestFollowers = ig.feed.accountFollowers(3703890771);
    const bestResponse = await bestFollowers.items();
    let result = [ ...bnbresponse.map(usr => usr.pk).splice(0,10), ...bestResponse.map(usr => usr.pk).splice(0,10)]
    return(result) 

  }

  exports.followUsers = async (instagram) =>{
    ig = instagram;
    followRoutine();
}