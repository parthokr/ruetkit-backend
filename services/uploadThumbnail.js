const fs = require('fs')
const stream = require('stream')
const {google} = require('googleapis')

const DRIVE_ID = '1bt3S6611BsHJn6zKt52Yxk-u9psHL6HU'

exports.uploadThumbnail = async (fileObject) => {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileObject.buffer);
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: 'api-key.json',
            scopes: ['https://www.googleapis.com/auth/drive']
        })

        const driveService = google.drive({
            version: 'v3',
            auth
        })


        const response = await driveService.files.create({
            fields: 'id,name',
            requestBody: {
                name: fileObject.originalname,
                parents: [DRIVE_ID]
            },
            media: {
                mimeType: fileObject.mimeType,
                body: bufferStream
            }
        })
        return response.data
    } catch(err) {
        console.log(err);
    }
}