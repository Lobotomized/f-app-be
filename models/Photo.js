const mongoose = require('mongoose');


const photoSchema = new mongoose.Schema({
    author: {type:mongoose.Schema.Types.ObjectId, ref:"User", required:true},
    postedOn: {
        type:Date,
        default:Date.now()
    },
    imageUrl: {type:String, required:true}
});
const Photo = mongoose.model('Photo', photoSchema);

module.exports = {Photo:Photo}