const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    user: {type:mongoose.Schema.Types.ObjectId, ref:"User", required:true},
    postedOn: {
        type:Date,
        default:Date.now
    },
    content: {type:String, required:true},
    hideFromUser: [{type:mongoose.Schema.Types.ObjectId, ref:"User", required:true}]
});
const Story = mongoose.model('Story', storySchema);
module.exports = {Story:Story}