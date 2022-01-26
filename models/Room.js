const mongoose = require('mongoose');
const roomSchema = new mongoose.Schema({
    roomType: String,
    fromPost: { required: false, type: { type: mongoose.Schema.Types.Story, ref: "User", required: true } },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    postedOn: {
        type: Date,
        default: Date.now
    },
    responder: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seenByAuthor: { type: Boolean, default: true },
    seenByResponder: { type: Boolean, default: false },
    leftByResponder: {type:Boolean, default: false},
    leftByAuthor: {type:Boolean, default: false},
    name: { type: String, required: true }

});
const Room = mongoose.model('Room', roomSchema);
module.exports = {Room:Room}