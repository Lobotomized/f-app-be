// module.exports =  User;
const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    username: { type: String, required: true, unique:false },
    password: { type: String, required: true },
    authorRooms:[{type:mongoose.Types.ObjectId, ref:"Room", required:true}],
    responderRooms:[{type:mongoose.Types.ObjectId, ref:"Room", required:true}]
});
const User = mongoose.model('User', userSchema);

module.exports = {User:User}