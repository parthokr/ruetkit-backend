const admin = require("firebase-admin");

const serviceAccount = require('./ruetkit-firebase-adminsdk-ov339-84e5818ac7.json');

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://ruetkit-default-rtdb.firebaseio.com"
    })
}

exports.sendNotification = ({ userID, approvalOrDisprovalNotification }) => {
    try {
        admin.database().ref(`/users/${userID}/token`).on('value', (snapshot) => {
            const registrationToken = snapshot.val()
            
            const message = {
                notification: approvalOrDisprovalNotification.notification,
                data: {
                    type: approvalOrDisprovalNotification.type
                },
                webpush: {
                    fcmOptions: {
                        link: approvalOrDisprovalNotification.link
                    }
                },
                token: registrationToken
            }

            // resgistrationToken may not exist for unsupported browsers
            if (!registrationToken) return
            admin.messaging().send(message)
              .then((response) => {
                // Response is a message ID string.
                console.log('Successfully sent message:', response);
              })
              .catch((error) => {
                console.log(error);
                throw error
            })
        })
    } catch (err) {
        throw err
    }
}