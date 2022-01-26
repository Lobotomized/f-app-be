const status = require('http-status');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const Story = require('../models/Story').Story;
const validateUser = require('../middleware/middleware').validateUser;
const Room = require('../models/Room').Room
const Message = require('../models/Message').Message
const Photo = require('../models/Photo').Photo
const User = require('../models/User').User

const aws = require('aws-sdk');

const multer = require('multer');
const multerS3 = require('multer-s3');

// Set S3 endpoint to DigitalOcean Spaces
const spacesEndpoint = new aws.Endpoint('https://fra1.digitaloceanspaces.com');
const s3 = new aws.S3({
    endpoint: "https://fra1.digitaloceanspaces.com",
    accessKeyId: "EQO3JJY36GZVWJ6ETE2X",
    secretAccessKey: "v5VusNPSBOelmart5ITfXiG0VXIEj7JT5BLZWNR/aJ0",
});




// Change bucket property to your Space name
const upload = multer({
    storage: multerS3({
        limits: { fieldSize: 25 * 1024 * 1024 },
        s3: s3,
        bucket: 'fappapp',
        acl: 'public-read',
        key: function (request, file, cb) {
            cb(null, Date.now() + Math.random() + '.png');
        }
    })
})

module.exports = function (app) {

    app.post('/test', validateUser, async function (req, res) {
        return res.status(status.OK).json({ bla: 'blabla' })
    }),

        app.post('/write', validateUser, async function (req, res) {
            const story = new Story();
            story.content = req.body.content;
            if (story.content.length > 1000) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: "Твърде много символи" })
            }
            story.user = req.user._id
            try {
                await story.save();
                return res.status(status.OK).json(story)

            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: "Нещо не е наред" })
            }
        }),

        app.get('/fantasies', validateUser, async function (req, res) {
            try {
                const stories = await Story.find({ user: { $ne: req.user._id }, hideFromUser:{$nin:[req.user._id]} }, { content: 1, user: 1 }).sort({ postedOn: -1 }).limit(5).skip(parseInt(req.query.skip) || 0)
                return res.status(status.OK).json(stories)

            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: err.message })
            }
        }),

        app.get('/newMessagesCount', validateUser, async function (req, res) {
            try {
                const newMessagesCount = await Room.find({ $or: [{ author: req.user._id, seenByAuthor: false }, { responder: req.user._id, seenByResponder: false }] }).countDocuments();
                return res.status(status.OK).json({ count: newMessagesCount });
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: err.message })
            }
        }),

        app.get('/loadRooms', validateUser, async function (req, res) {
            try {
                const rooms = await Room.find({ $or: [{ $and: [{ author: req.user._id }, { leftByAuthor: false }] }, { $and: [{ responder: req.user._id }, { leftByResponder: false }] }] }, { name: 1, seenByAuthor: 1, seenByResponder: 1 }).sort({ postedOn: -1 })
                return res.status(status.OK).json(rooms)
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: err.message })
            }
        }),
        app.post('/leaveRoom', validateUser, async function (req, res) {
            try {
                const room = await Room.findOne({ _id: req.body.roomId })
                const user = await User.findOne({ _id: req.user._id });

                if (room.author + "" === req.user._id) {
                    user.authorRooms = user.authorRooms.filter((innerRoom) => {
                        if (innerRoom._id != room._id) {
                            return true;
                        }
                        return false;
                    });
                    await user.save();
                    room.leftByAuthor = true;
                }
                if (room.responder + "" === req.user._id) {
                    user.responderRooms = user.responderRooms.filter((innerRoom) => {
                        if (innerRoom._id != room._id) {
                            return true;
                        }
                        return false;
                    });
                    await user.save();
                    room.leftByResponder = true;
                }
                await room.save();

                return res.status(status.OK).json({ message: "Успешно" })
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: err.message })
            }
        }),
        app.get('/loadRoom', validateUser, async function (req, res) {
            try {
                const rooms = await Room.findOne({ $or: [{ $and: [{ author: req.user._id }, { leftByAuthor: false }] }, { $and: [{ responder: req.user._id }, { leftByResponder: false }] }] }, { name: 1, seenByAuthor: 1, seenByResponder: 1 }).sort({ postedOn: -1 })
                return res.status(status.OK).json(rooms)
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: err.message })
            }
        }),
        app.get('/loadRoomByPostAndUser/:postId', validateUser, async function (req, res) {
            try {
                const rooms = await Room.findOne({ $or: [{ author: req.user._id }, { responder: req.user._id }], fromPost: req.params.postId }, { name: 1, seenByAuthor: 1, seenByResponder: 1 }).sort({ postedOn: -1 })
                return res.status(status.OK).json(rooms)
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: err.message })
            }
        }),
        app.get('/loadMessages/:roomId', validateUser, async function (req, res) {
            try {
                const messages = await Message.find({ room: req.params.roomId }).limit(parseInt(req.query.limit) || 50).sort({ postedOn: -1 })
                const room = await Room.findOne({ _id: req.params.roomId }).sort({ postedOn: 1 });
                if (String(room.responder) === String(req.user._id) && !room.seenByResponder) {
                    room.seenByResponder = true;
                    room.save();
                }
                else if (String(room.author) === String(req.user._id) && !room.seenByAuthor) {
                    room.seenByAuthor = true;
                    room.save();

                }
                return res.status(status.OK).json(messages)
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: err.message })
            }
        }),
        app.get('/loadMessages', validateUser, async function (req, res) {
            try {
                const room = await Room.findOne({}).sort({ postedOn: 1 });

                const messages = await Message.find({ room: room._id })
                return res.status(status.OK).json(messages)
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: err.message })
            }
        }),
        app.post('/upload', validateUser, upload.single('upload'), async function (req, res) {
            try {
                let photo = new Photo({
                    author: req.user._id,
                    imageUrl: req.file.location
                })
                await photo.save();
                return res.status(status.OK).json({ photo: photo })
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: "Нещо не е наред..." })
            }
        }),
        app.get('/photosForUser', validateUser, async function (req, res) {
            try {
                const photos = await Photo.find({ author: req.user._id }).sort({ postedOn: -1 }).limit(20).skip(parseInt(req.query.skip) || 0);

                return res.status(status.OK).json({ photos: photos });
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ err: err.message })
            }
        }),
        app.delete('/photo/:photoId', validateUser, async function (req, res) {
            try {
                await Photo.deleteOne({ _id: req.params.photoId, author: req.user._id });
                return res.status(status.OK).json({ message: "Снимката е изтрита успешно" })
                // const photos = await Photo.find({author:req.user._id}).sort({postedOn:-1}).limit(20).skip(parseInt(req.query.skip) || 0);

                // return res.status(status.OK).json({photos:photos});
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ err: err.message })
            }
        }),

        app.post('/createRoomFromPostId', validateUser, async function (req, res) {
            Story.findOne({ _id: req.body.postId }, async (err, story) => {
                if (!story) {
                    return res.status(status.UNPROCESSABLE_ENTITY);
                }

                story.hideFromUser = [...story.hideFromUser, req.user._id];
                await story.save();
                User.findOne({ _id: req.user._id }, (err, conversationStarter) => {
                    if (!conversationStarter) {
                        return res.status(status.UNAUTHORIZED).json({ message: 'No such User' });
                    }
                    User.findOne({ _id: story.user }, (err, responder) => {
                        Room.findOne({ fromPost: req.body.postId, author: conversationStarter }, async (err, oldRoom) => {
                            if (!oldRoom) {
                                const newRoom = new Room({
                                    roomType: "fromPost",
                                    fromPost: req.body.postId,
                                    author: mongoose.Types.ObjectId(conversationStarter._id),
                                    responder: story.user,
                                    name: story.content.split(' ').slice(0, 3).join(' ')
                                })
                                conversationStarter.authorRooms.push(newRoom._id);
                                responder.responderRooms.push(newRoom._id);
                                conversationStarter.save();
                                responder.save();

                                await newRoom.save();
                                return res.status(status.OK).json({ message: 'Success' })
                            }
                            else {
                                return res.status(status.OK).json({ message: 'Success' });
                            }
                        })
                    })
                })
            })
        })
}
