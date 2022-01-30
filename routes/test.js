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

    app.get('/api/test', async function (req, res) {
        return res.status(status.OK).json({ bla: 'blabla' })
    }),

        app.post('/api/write', validateUser, async function (req, res) {
            const storiesCount = await Story.find({ postedOn: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, user: req.user._id }).countDocuments();
            if (storiesCount > 6) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: "Публикувал си твърде много фантазии днес. Пробвай утре." })
            }
            const story = new Story();
            story.content = req.body.content;
            if (story.content.length > 1000) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: "Твърде много символи" })
            }
            if (story.content.length === 50) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: "Не достатъчно символи" })
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

        app.get('/api/fantasies', validateUser, async function (req, res) {
            try {
                const stories = await Story.find({ user: { $ne: req.user._id }, hideFromUser: { $nin: [req.user._id] } }, { content: 1, user: 1 }).sort({ postedOn: -1 }).limit(5).skip(parseInt(req.query.skip) || 0)
                return res.status(status.OK).json(stories)

            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: err.message })
            }
        }),

        app.get('/api/newMessagesCount', validateUser, async function (req, res) {
            try {
                const newMessagesCount = await Room.find({ $or: [{ author: req.user._id, seenByAuthor: false }, { responder: req.user._id, seenByResponder: false }] }).countDocuments();
                return res.status(status.OK).json({ count: newMessagesCount });
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: err.message })
            }
        }),

        app.get('/api/loadRooms', validateUser, async function (req, res) {
            try {
                const rooms = await Room.find({ $or: [{ $and: [{ author: req.user._id }, { leftByAuthor: false }] }, { $and: [{ responder: req.user._id }, { leftByResponder: false }] }] },
                    { name: 1, seenByAuthor: 1, seenByResponder: 1, profileShareByAuthor: 1, profileShareByResponder: 1 }).populate({ path: 'responder', select: 'avatar -_id', populate: {path:'avatar'} })
                    .populate({ path: 'author', select: 'avatar -_id', populate: {path:'avatar'} }).sort({ postedOn: -1 })
                return res.status(status.OK).json(rooms)
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: err.message })
            }
        }),
        app.get('/api/getMe', validateUser, async function (req, res) {
            try {
                const me = await User.find({ _id: req.user._id })
                return res.status(status.OK).json({ me: me })
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: err.message })
            }
        }),
        app.post('/api/leaveRoom', validateUser, async function (req, res) {
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
        app.get('/api/roomSecretInfo/:roomId', validateUser, async function (req, res) {
            try {
                const room = await Room.findOne({ _id: req.params.roomId });
                if (room.responder + '' === req.user._id + '' && room.profileShareByAuthor) {
                    const otherGuyData = await User.findOne({ _id: room.author }, { username: 1, avatar: 1 });
                    return res.status(status.OK).json(otherGuyData);
                }
                else if (room.author + '' === req.user._id + '' && room.profileShareByResponder) {
                    const otherGuyData = await User.findOne({ _id: room.responder }, { username: 1, avatar: 1 });
                    return res.status(status.OK).json(otherGuyData);
                }
                else {
                    return res.status(status.UNAUTHORIZED).json({ message: "Нещо не е наред..." })
                }
            }
            catch (err) {
                console.log(err)
                return res.status(status.UNPROCESSABLE_ENTITY).json(err);
            }
        }),
        app.get('/api/loadRoom', validateUser, async function (req, res) {
            try {
                const rooms = await Room.findOne({ $or: [{ $and: [{ author: req.user._id }, { leftByAuthor: false }] }, { $and: [{ responder: req.user._id }, { leftByResponder: false }] }] }, { name: 1, seenByAuthor: 1, seenByResponder: 1, profileShareByAuthor: 1, profileShareByResponder: 1 }).sort({ postedOn: -1 })
                return res.status(status.OK).json(rooms)
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: err.message })
            }
        }),
        app.get('/api/loadRoomByPostAndUser/:postId', validateUser, async function (req, res) {
            try {
                const rooms = await Room.findOne({ $or: [{ author: req.user._id }, { responder: req.user._id }], fromPost: req.params.postId }, { name: 1, seenByAuthor: 1, seenByResponder: 1 }).sort({ postedOn: -1 })
                return res.status(status.OK).json(rooms)
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: err.message })
            }
        }),
        app.post('/api/setProfileShareToTrue', validateUser, async function (req, res) {
            try {
                const room = await Room.findOne({ _id: req.body.roomId });
                if (!room) {
                    return res.status(status.NOT_FOUND).json({ message: "Няма такава стая" })
                }
                if (room.responder + '' === req.user._id + '') {
                    room.profileShareByResponder = true;
                    await room.save();
                    return res.status(status.OK).json({ message: "Успешно даде права" })
                }
                else if (room.author + '' === req.user._id + '') {
                    room.profileShareByAuthor = true;
                    await room.save();
                    return res.status(status.OK).json({ message: "Успешно даде права" })
                }

                return res.status(status.UNAUTHORIZED).json({ message: "Да не се опитваш да направиш нещо палаво?" })
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json(err);
            }
        }),
        app.get('/api/loadMessages/:roomId', validateUser, async function (req, res) {
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
        app.get('/api/loadMessages', validateUser, async function (req, res) {
            try {
                const room = await Room.findOne({}).sort({ postedOn: 1 });

                const messages = await Message.find({ room: room._id })
                return res.status(status.OK).json(messages)
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ message: err.message })
            }
        }),
        app.post('/api/upload', validateUser, upload.single('upload'), async function (req, res) {
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
        app.get('/api/photosForUser', validateUser, async function (req, res) {
            try {
                const photos = await Photo.find({ author: req.user._id }).sort({ postedOn: -1 }).limit(20).skip(parseInt(req.query.skip) || 0);

                return res.status(status.OK).json({ photos: photos });
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json({ err: err.message })
            }
        }),
        app.post('/api/setAvatar', validateUser, async function (req, res) {
            const user = await User.findOne({ _id: req.user._id });
            const photo = await Photo.findOne({ _id: req.body.photoId, author: req.user._id });

            if (!photo) {
                return res.status(status.UNAUTHORIZED).json({ message: "Нямате достъп до такава снимка" });
            }

            user.avatar = photo._id;

            try {
                await user.save();
                return res.status(status.OK).json({ avatar: photo })
            }
            catch (err) {
                return res.status(status.UNPROCESSABLE_ENTITY).json(err);
            }
        }),
        app.delete('/api/photo/:photoId', validateUser, async function (req, res) {
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

        app.post('/api/createRoomFromPostId', validateUser, async function (req, res) {
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
                        Room.findOne({ fromPost: req.body.postId, author: conversationStarter._id }, async (err, oldRoom) => {
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
                                try {
                                    await conversationStarter.save();
                                    await responder.save();
                                }
                                catch (err) {
                                    return res.status(status.UNPROCESSABLE_ENTITY).json(err)
                                }


                                await newRoom.save();
                                return res.status(status.OK).json(newRoom)
                            }
                            else {
                                return res.status(status.OK).json(oldRoom);
                            }
                        })
                    })
                })
            })
        })

}
