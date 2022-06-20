const admin = require("firebase-admin")
const serviceAccount = require('./ruetkit-firebase-adminsdk-ov339-84e5818ac7.json');

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://ruetkit-default-rtdb.firebaseio.com"
    })
}
const db = admin.firestore()

exports.removeFCMToken = async ({ userID, token }) => {
    // return admin.database().ref('users').child(userID).set(
    //     {
    //         token
    //     }
    // )
    db.collection('data').doc(userID.toString()).update({
        tokens: admin.firestore.FieldValue.arrayRemove(token)
    }, {merge: true})
    .then((data) => {
        console.log(data)
    })
    .catch((err) => {
        console.log(err);
    })
    return 
}

// admin.messaging().send(message)
//   .then((response) => {
//     // Response is a message ID string.
//     console.log('Successfully sent message:', response);
//   })
//   .catch((error) => {
//     console.log('Error sending message:', error);
// })