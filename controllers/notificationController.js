const { prisma } = require("@prisma/client")
const RuetkitError = require("../errors/ruetkit")
const { 
    countNotifications: _countNotifications,
    listNotification: _listNotification,
    markAsRead: _markAsRead,
    markAsUnread: _markAsUnread,
    createNotification: _createNotification
} = require("../services/manageNotification")

exports.countNotifications = async (req, res, next) => {
    try {
        _countNotifications({userID: req.user.id, cb: (code, data) => {res.status(code).send(data)}})
    } catch (err) {
        console.log(err)
        return next(new RuetkitError())
    }
}

exports.listNotifications = async (req, res, next) => {
    let {page, skip=0} = req.query
    page = Number(page)
    skip = Number(skip)
    if (page === '' || page === null || page === undefined || isNaN(page)) {
        return next(new RuetkitError(400, {detail: 'page is required'}))
    }
    _listNotification({userID: req.user.id, page, skip, cb: (data) => {res.status(200).send(data)}})
}

exports.markAsRead = async (req, res, next) => {
    const {notificationID} = req.params
    _markAsRead({userID: req.user.id, notificationID: notificationID, cb: (code, data) => {res.status(code).send(data)}})
}

exports.markAsUnread = async (req, res, next) => {
    const {notificationID} = req.params
    // _markAsUnread({userID: req.user.id, notificationID: notificastionID, cb: (code, data) => {res.status(code).send(data)}})
    _markAsUnread({userID: req.user.id, notificationID, cb: (code, data) => {res.status(code).send(data)}})
}


// TODO remove
exports.createNotification = async (req, res, next) => {
    const {title, body, navigate} = req.body
    _createNotification({userID: req.user.id, title, body, severity: "info", navigate, cb: (code, data) => {res.status(code).send(data)}})
    res.sendStatus(200)
}