//
// Imports
//
const client = require('../config/config').client;
const { validationResult } = require('express-validator');
const db = require('../config/config').db;

//
// Get the call history
//
const findCallHistory = async(req,res) => {

    try {

        //
        // Declare a data
        //
        const data = {
            ...req.params,
            input:req.body,
            output:{
                callHistoryArray:[],
                response: []
            }
            
        }

        //
        // validate input
        //
        await validateRequest(req);

        //
        // get Blocked list
        //
        await getBlockedUserList(data);


        //
        // get call history
        //
        await getUserHistory(data);

        
        if(data.output.callHistoryArray.length) {
        
            //
            // get user details
            //
            await getAllUserDetails(data);

            //
            // transform response
            //
            await buildFinalResponse(data);
           

        }

       
        //
        // send response
        // 
        res.status(200).json({
            'status': 200,
            'success': true,
            'message': 'Data retrieved successfully',
            'data': data.output.response
        });

    } catch(error) {

        console.log(error);
        res.status(error.status || 500).json({'status':error.status || '500','success': false,'message':error.message || 'There is something wrong'});

    }

}

//
// validate Request data
//
const validateRequest = async(req) => {

    try {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const err = new Error();
            err.status = 400;
            err.message = 'Invalid data provided';
            throw error; 
        }

    } catch (error) {

        throw error;

    }
}

//
// get blocked users list
//
const getBlockedUserList = async(data) => {
    try {
        return new Promise((resolve, reject) => {
            db.query('SELECT b.blocked_module_id FROM eyerne.eye_user_blocking_settings u,eyerne.eye_blocked_module_mapping b WHERE u.blocker_id = '+data.id+' AND u.block_id = b.block_id AND u.block_type = "CHAT_CALL" ',async (err, response) => {
                if (err) {
                    console.log('Error in block user sql query', err);
                    const error = new Error();
                    error.status = 400;
                    error.message = 'Error in block user sql query';
                    reject(error);
                } else {
                    console.log('response', response);
                    let blockedList = [];
                    for (const blocked of response) {
                        blockedList.push(blocked.blocked_module_id);
                    }
                    data.output.blockedList = blockedList;
                    resolve(data);
                }
            })
        });
    

        
    } catch (error) {

        throw error;
    }
}

//
// get user history
//
const getUserHistory = async(data) => {
    console.log('data in getuser History', data);
    try {
        return new Promise((resolve,reject) => {
            return client.search({
                index: 'audio_video_chat',
                type: 'eye_audio_video_chat',
                body: {
                    "query": {
                        "bool": {
                          "must": [
                            {
                              "match": {
                                "members": {
                                  "query": data.id
                                }
                              }
                            }
                          ],
                          "must_not": [
                            {
                              "terms": {
                                "call_details.from_user": data.output.blockedList
                              }
                            }
                          ]
                        }
                      },"sort": [
                        {
                            "start_time.keyword": {
                              "order": "desc"
                            }
                          }
                        ]
                    }
                }, async (err, response) => {
                    if (err) {
                        
                        console.log('Error', err);
                        const error = new Error();
                        error.status = 400;
                        error.message = 'Error in es history 1st query';
                        reject(error);
    
                    } else {
                        
                        data.output.callHistoryArray = response.hits.hits.map(hit => hit._source);
                        resolve(data);
    
                    }
                });
        })
        
    } catch (error) {

        throw error;

    }
}

//
// get user details
//
const getAllUserDetails = async(data) => {

    try {

        for (const [key,user] of data.output.callHistoryArray.entries()) {

            const userMemberDetails = await getUserDetails(user);
            if(userMemberDetails.length) {

                //
                // Find the member nickname
                //
                const userNickNames = await getNickName(userMemberDetails, data.id);

                //
                // build user array
                //
                const userData = await buildUserObject(userMemberDetails, userNickNames, data.id);

                data.output.callHistoryArray[key]['member_details'] = userData;

            } else {

                data.output.callHistoryArray[key]['member_details'] = [];
            }
        }

        return data;

    } catch (error) {

        throw error;

    }

}

//
// get user details
//
const getUserDetails = async(user) => {

    try {
        return new Promise((resolve,reject) => {
            client.search({
                index: 'user_profile',
                type: 'es_users',
                body: {
                    query: {
                            "bool": {
                              "must": [
                                {
                                  "terms": {
                                    "userProfileId": user['members']
                                  }
                                }
                            ]
                        }
                    }
                }
            }, async (err, response) => {
    
                if (err) {
    
                    console.log('ERROR :: GetUserDetails :: '+ JSON.stringify(err));
                    const customErr = new Error();
                    customErr.status = 400;
                    customErr.message = 'Error in ES second query';
                    reject(customErr);
                    
                } else {
                    
                    let userDetails = response.hits.hits.map(hit => hit._source);
                    resolve(userDetails);
    
                }
            });
        })
        

    } catch (error) {

        throw error;

    }

}

//
// Get user nick name
//
const getNickName = async(userMemberDetails, userId) => {
    
    try {

        return new Promise((resolve,reject) => {
            
            let memberDetailsId = userMemberDetails.map(user => {

                if (userId != user.userProfileId) {
    
                    return user.userProfileId;
    
                } else {

                    return 0;

                }
    
            });
            client.search({
                index: 'chat_nick_name',
                type: 'eye_chat_nick_name',
                body: {
                    "query": {
                        "bool": {
                          "must": [
                            {
                              "term": {
                                "from_user_id": userId
                              }
                            },
                            {
                              "terms": {
                                "to_user_id":memberDetailsId
                              }
                            }
                          ]
                        }
                      },
                      "size": 1000
                }
            }, async (err, response) => {
                if (err) {
    
                    console.log('ERROR :: GetNickName :: ' + JSON.stringify(err));
                    const customErr = new Error();
                    customErr.status = 400;
                    customErr.message = 'Error in finding NickName';
                    reject(customErr);
    
                } else {
                  
                    let nickNameArray = response.hits.hits.map(hit => hit._source);
                    let nickNameId = {}
                    if (nickNameArray.length) {
    
                        nickNameArray.forEach( value =>{
    
                            nickNameId[value.to_user_id] = value.nick_name;
    
                        });
    
                    }
    
                    resolve(nickNameId);
                  
                }
            });
    
        });

    } catch (error) {

        throw error;

    }

}

//
// build user object
//
const buildUserObject = async(userMemberDetails, userNickNames, userId) => {

    try {

        let user = [];
        let userName = '';
        for(const userData of userMemberDetails) {

            if(userData.userProfileId != userId) {
                userName = userData.firstName +' '+userData.lastName; 

                if (userData.userProfileId in userNickNames) {

                    userName = userNickNames[userData.userProfileId];

                }

                user.push({
                    userId: userData.userProfileId,
                    userName: userName,
                    userProfilePic: userData.profilePictureURL
                });
            }
            
        }

        return user;

    } catch (error) {

        throw error;

    }

}

// 
// build final response
//
const buildFinalResponse = async(data) => {

    try {

        let response = [];

        for(const callHistory of data.output.callHistoryArray) {

            response.push({
                roomId: callHistory.roomId,
                duration: callHistory.duration,
                startTime: callHistory.start_time,
                member_details: callHistory.member_details,
                type: callHistory.type,
                received_details: callHistory.received,
                call_by: callHistory.call_by
            })

        }
        data.output.response = response;
        return data;

    } catch (error) {
        
        throw error;

    }
}



//
// Get room details API
//
const findRoomDetails = async(req,res) => {

    try {
        
        //
        // Declare a data
        //
        const data = {
            ...req.params,
            input:req.body,
            output:null
            
        }

        //
        // validate input
        //
        await validateRequest(req);

        //
        // get room details
        // 
        await getRoomDetails(data);

         //
        // send response
        // 
        res.status(200).json({
            'status': 200,
            'success': true,
            'message': 'Data retrieved successfully',
            'data': data.output
        });

    
    
    
    } 
    catch(error) {

        console.log(error);
        res.status(error.status || 500).json({'status':error.status || '500','success': false,'message':error.message || 'There is something wrong'});
    }
}

const getRoomDetails = async(data) => {

    try {

        return new Promise((resolve,reject) => {

            client.search({
                index: 'audio_video_chat',
                type: 'eye_audio_video_chat',
                body: {
                    "query": {
                        "bool": {
                          "must": [
                            {
                              "term": {
                                "room_id": {
                                  "value": data.room_id
                                }
                              }
                            }
                          ]
                        }
                    }
                 }
            }, async (err, response) => {
                if (err) {
                    console.log(' Error in room details API ::' +JSON.stringify(err));
                    const customErr = new Error();
                    customErr.status = 400;
                    customErr.message = 'Error in finding Room details';
                    reject(customErr);
                } else {
                    let roomDetails = response.hits.hits.map(hit => hit._source);
                    if (roomDetails.length ) {
                        console.log(' Room details', roomDetails);
                        data.output = roomDetails[0];
                    } else {
                        data.output = null;
                    }
                  
                      resolve(data);
                }
            })

        })

    } catch(error) {
        throw error;
    }
}

module.exports = {
    findCallHistory,
    findRoomDetails
};