const mongoose = require('mongoose');


const messageSchema = new mongoose.Schema({
    author: {type:mongoose.Schema.Types.ObjectId, ref:"User", required:true},
    postedOn: {
        type:Date,
        default:Date.now
    },
    content: {type:String, required:true},
    photoUrl: {type:String, required:false},
    photo: {type:mongoose.Schema.Types.ObjectId, ref:"Photo", required:false},

    room:{type:mongoose.Schema.Types.ObjectId, ref:"Room", required:true},
});
const Message = mongoose.model('Message', messageSchema);

module.exports = {Message:Message}