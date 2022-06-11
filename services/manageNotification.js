const admin = require("firebase-admin");

const serviceAccount = require('./ruetkit-firebase-adminsdk-ov339-84e5818ac7.json');

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://ruetkit-default-rtdb.firebaseio.com"
    })
}


exports.listNotification = async ({userID, cb}) => {
    admin.database().ref(`/notifications/${userID}`).on('value', (snapshot) => {
         cb(snapshot.val())
    })
}

exports.createNotification = async ({userID, text, navigate}) => {
    let prevNotifications = []
    admin.database().ref(`/notifications/${userID}`).on('value', async (snapshot) => {
        prevNotifications = snapshot.val()
   })
   prevNotifications.push({text, navigate})
   console.log(prevNotifications);
   await admin.database().ref(`/notifications`).child(`${userID}`).set({...prevNotifications})
}