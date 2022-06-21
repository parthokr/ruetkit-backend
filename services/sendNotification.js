const admin = require("firebase-admin");

const serviceAccount = require('./ruetkit-firebase-adminsdk-ov339-84e5818ac7.json');

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://ruetkit-default-rtdb.firebaseio.com"
    })
}

const db = admin.firestore()

exports.sendNotification = ({ id, userID, approvalOrDisprovalNotification }) => {
    db.collection('data').doc(userID.toString()).get()
        .then((doc) => {
            if (!doc.exists) {
                return console.log('Couldn\'t send notification');
            }
            let registrationTokens = doc.get('tokens') || []

            registrationTokens.map(token => {
                const message = {
                    notification: approvalOrDisprovalNotification.notification,
                    data: {
                        id,
                        severity: approvalOrDisprovalNotification.severity,
                        navigate: approvalOrDisprovalNotification.navigate
                    },
                    webpush: {
                        fcmOptions: {
                            link: approvalOrDisprovalNotification.link
                        }
                    },
                    token: token
                }
    
                // resgistrationToken may not exist for unsupported browsers
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
        })
    // try {
    //     admin.database().ref(`/users/${userID}/token`).on('value', (snapshot) => {
    //         const registrationToken = snapshot.val()
            
    //         const message = {
    //             notification: approvalOrDisprovalNotification.notification,
    //             data: {
    //                 severity: approvalOrDisprovalNotification.severity,
    //                 navigate: approvalOrDisprovalNotification.navigate
    //             },
    //             webpush: {
    //                 fcmOptions: {
    //                     link: approvalOrDisprovalNotification.link
    //                 }
    //             },
    //             token: registrationToken
    //         }

    //         // resgistrationToken may not exist for unsupported browsers
    //         if (!registrationToken) return
    //         admin.messaging().send(message)
    //           .then((response) => {
    //             // Response is a message ID string.
    //             console.log('Successfully sent message:', response);
    //           })
    //           .catch((error) => {
    //             console.log(error);
    //             throw error
    //         })
    //     })
    // } catch (err) {
    //     throw err
    // }
}