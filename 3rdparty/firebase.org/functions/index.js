const functions = require("firebase-functions");
const admin = require("firebase-admin");
//const util = require("util");

//const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

admin.initializeApp();
const database = admin.database();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

exports.deltaChanged = functions.database.ref('/creta_delta/{id}/delta')
    .onWrite((change, context) => {
        var old_delta = change.before.val();
        var new_delta = change.after.val();
        var mid = context.params.id;
        database.ref('/creta_log/text').set('skpark changed =' + mid);
        functions.logger.log('skpark changed =' + mid);
        return null;
});

exports.removeDelta_schedule = functions.pubsub.schedule('every 24 hours').onRun((context) => {
    return _removeDelta();
});

exports.removeDelta = functions.https.onCall((data) => {
    return _removeDelta();
});

function _removeDelta()
{
    let now = new Date();
    now.setDate(now.getDate() - 1);
    let yesterday = now.toISOString().replace(/T/, ' ').replace(/\..+/, '.000Z');
    var counter = 0;
    return database.ref('/creta_delta').orderByChild('updateTime').endBefore(yesterday).once('value').then((snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const childKey = childSnapshot.key;
            const childData = childSnapshot.val();
            counter++;  

            var key = '/creta_delta/' + childKey +'/';
            functions.logger.log('skpark start remove =' + key);
            database.ref(key).remove((error) => {
                if(error) {
                    functions.logger.log('skpark removed =' + key + ' failed : ' + error);
                } else {
                    functions.logger.log('skpark removed =' + key + ' succeed');
                }
            });  
        });
        functions.logger.log('skpark listed(' + yesterday + ') = ' + counter);
        return '{result: removeDelta_called(' + counter + ' deleted)';
    });
    
}



//oper  : https://us-central1-creta02-1a520.cloudfunctions.net/setTest_req?id=6&text=helloworld4
exports.setDBTest_req = functions.https.onRequest(async (req, res) => {
   _setDBTest(req.query.id, req.query.text);
    res.json({result: `create ${req.query.id}`});
}); 

exports.setDBTest = functions.https.onCall((data) => {
     _setDBTest(data.id, data.text);
     return "{result: create " + data.id + "}";
}); 

function  _setDBTest(id, text) {
    const db = getFirestore();
    const docRef = db.collection('test_collection').doc(id);
    docRef.set({'text' : text});
    functions.logger.info("Document written with ID: ", docRef.id);
}

//oper  : https://us-central1-creta02-1a520.cloudfunctions.net/getDBTest_req?text=helloworld
exports.getDBTest_req = functions.https.onRequest(async (req, res) => {
    result = await _getDBTest2(req.query.text);
     res.json({result: `get=>${result}`});
 }); 
 
exports.getDBTest = functions.https.onCall(async (data) => {
    var result = 'null';
    result = await _getDBTest2(data.text);
    return '{"result": "' + result + '"}';
 }); 
async function  _getDBTest2(text) {
    functions.logger.info('skpark __getDBTest invoked');
    const db = getFirestore();
    const querySnapshot = await db.collection('test_collection').where('text' , '=', text).get();
    var retval = '';
    querySnapshot.forEach((doc) => {
        functions.logger.info(doc.id, ' => ', doc.data());
        retval += doc.data().text;
        retval += ",\n";
    });
    return retval;
}

exports.getDiskUsage_req = functions.https.onRequest(async (req, res) => {
    var result = await _getDiskUsage();
     res.json({result: `${result}`});
 }); 
exports.getDiskUsage = functions.https.onCall((data) => {
    return _getDiskUsage();
}); 

async function  _getDiskUsage() {
    functions.logger.info('skpark _getDiskUsage invoked');
    const db = getFirestore();
    const ref = db.collection('disk_usage').doc('simulator');
    const doc = await ref.get();
    if (!doc.exists) {
        functions.logger.log('No such document!');
        return 20;
    } else {
        functions.logger.log('Document data:', doc.data());
        return doc.data().usage;
    }
}

exports.setDiskUsage_schedule = functions.pubsub.schedule('every 9 hours').onRun(async (context) => {
    var usage = await _getDiskUsage();
    if(usage > 98) {
        usage = 98;
    }
    return _setDiskUsage(usage+1);
});
exports.setDiskUsage_req = functions.https.onRequest(async (req, res) => {
    //var rand = Math.floor(Math.random() * 80) + 20;
    var result = await _setDiskUsage(req.query.usage);
    var result = await _setDiskUsage(rand);
    res.json({result: `${rand}`});
 }); 
exports.setDiskUsage = functions.https.onCall((data) => {
    //var rand = Math.floor(Math.random() * 80) + 20;
    return _setDiskUsage(data.usage);
}); 
async function  _setDiskUsage(usage) {
    functions.logger.info('skpark _setDiskUsage($val) invoked');
    const db = getFirestore();
    const ref = db.collection('disk_usage').doc('simulator');
    ref.set({'usage' : usage});
    functions.logger.log('skpark _setDiskUsage($val) end');
    return usage;
}



// query 에 대한 자세한 예제는 https://firebase.google.com/docs/firestore/query-data/queries
// function  __getDBTest(text) {
//     functions.logger.info('skpark __getDBTest invoked');
//     const db = getFirestore();
//     return new Promise(function(resolve, reject) {
//         resolve(db.collection('test_collection').where('text' , '=', text).get());
//     });
// }

// function  _getDBTest(text) {
//     return __getDBTest(text).then(function(querySnapshot) {
//         var retval = '';
//         querySnapshot.forEach((doc) => {
//             functions.logger.info(doc.id, ' => ', doc.data());
//             retval += doc.data();
//             return retval;
//           });
//     });
   
// }
