const admin = require("firebase-admin");
const { v4: uuidv4 } = require('uuid')
const serviceAccount = require('./ruetkit-firebase-adminsdk-ov339-84e5818ac7.json');

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://ruetkit-default-rtdb.firebaseio.com"
    })
}

const db = admin.firestore()

exports.countNotifications = async ({userID, cb}) => {
    db.collection('notifications').where('user_id', '==', userID).where('read', '==', false).get()
    .then((doc) => {
        cb(200, {count: doc.size})
    })

}

exports.listNotification = async ({userID, cb}) => {
    // admin.database().ref(`/notifications`).orderBy('user_id').once('value', (snapshot) => {
    //      cb(snapshot.val() || [])
    // })
    db.collection('notifications').where('user_id', '==', userID).orderBy('created_on', 'desc').get()
    .then((doc) => {
        const cols = ['id', 'title', 'body', 'read', 'severity', 'navigate', 'created_on']
        const rows = []
        doc.forEach(row => {
            let _row = {}
            cols.forEach(col => {
                _row[col] = row.get(col)
            })
            rows.push(_row)
        })
        cb(rows)
    })
}

exports.markAsRead = async ({userID, notificationID, cb}) => {
    db.collection('notifications').doc(notificationID).get()
    .then((doc) => {
        if (doc.get('user_id') === userID) {
            if (doc.get('read')) return cb(400, {error: {detail: 'Already read'}})
            db.collection('notifications').doc(notificationID).update({
                read: true
            }).then(()=>{
                cb(200)
            }).catch(err => {
                console.log(err)
            })
        } else {
            cb(403, {error: {detail: 'You are not allowed to perform this request'}})
        }
    })
}

exports.markAsUnread = async ({userID, notificationID, cb}) => {
    db.collection('notifications').doc(notificationID).get()
    .then((doc) => {
        if (doc.get('user_id') === userID) {
            if (!doc.get('read')) return cb(400, {error: {detail: 'Already unread'}})
            db.collection('notifications').doc(notificationID).update({
                read: false
            }).then(()=>{
                cb(200)
            }).catch(err => {
                console.log(err)
            })
        } else {
            cb(403, {error: {detail: 'You are not allowed to perform this request'}})
        }
    })
}

exports.createNotification = async ({id, userID, title, body, severity, navigate}) => {
    
    // let prevNotifications = []
    // admin.database().ref(`/notifications/${userID}`).on('value', async (snapshot) => {
    //     prevNotifications = snapshot.val() || []
    // })
//    prevNotifications.push({id, title, body, severity, navigate, read: false, created_on: Date.now()})
//    console.log(prevNotifications);
//    await admin
//         .database()
//         .ref(`/notifications`)
//         .child(`/${id}`)
//         .set({user_id: userID, title, body, severity, navigate, read: false, created_on: Date.now()})
    // db.collection('notifications').doc(userID.toString()).create({})
    id = id || uuidv4()
    db.collection('notifications').doc(id).set({
        id: id,
        user_id: userID,
        title, 
        body, 
        severity,
        navigate, 
        read: false, 
        created_on: Date.now()
    })
    // db.collection(`data`).doc('notifications').update({
    //     [userID.toString()]: admin.firestore.FieldValue.arrayUnion({
    //         title, 
    //         body, 
    //         severity,
    //         navigate, 
    //         read: false, 
    //         created_on: Date.now()
    //     })
    // })
}