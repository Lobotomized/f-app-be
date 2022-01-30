const express = require('express');
const app = express();
const server = require('http').createServer(app)
const status = require('http-status');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User').User
const Room = require('./models/Room').Room

const Story = require('./models/Story').Story
const Message = require('./models/Message').Message
const path = require('path');







const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

// io.use((socket, next) => {
//   const username = socket.handshake.auth?.username;
//   if (!username) {
//     return next(new Error("invalid username"));
//   }
//   socket.username = username;
//   next();
// });


io.on("connection", (socket) => {
  //Join all rooms that the user has
  User.findOne({ _id: mongoose.Types.ObjectId(socket.handshake.auth.userId) }, (err, user) => {
    if (!user) {
      return;
    }
    const rooms = [...user.authorRooms, ...user.responderRooms];
    rooms.forEach((room) => {
      socket.join(String(room));
    })
  })

  socket.on("joinFromPost", async (receivable) => {
    const story = await Story.findOne({_id:receivable.postId});
    const socks = await io.fetchSockets();
    const authSock = socks.find((so) => {
      return so.handshake.auth.userId + '' === story.user + '';
    })
    const room = await Room.findOne({fromPost:receivable.postId, _id:receivable.chatId});
    if(authSock){
      authSock.join(String(room._id));
      socket.to(String(room._id)).emit('message', { message: 'Convo start', user: socket.handshake.auth.userId, roomId: receivable.roomId });
    }
    socket.join(String(room._id));
  })

  socket.on("message", async (receivable) => {

    socket.to(receivable.roomId).emit('message', { message: receivable.message, user: socket.handshake.auth.userId, roomId: receivable.roomId });
    const room = await Room.findOne({ _id: receivable.roomId });
    if(receivable?.message?.photo && (!room.profileShareByResponder || !room.profileShareByAuthor)){
      return;
    }
    if (receivable.message) {
      const message = new Message({
        author: socket.handshake.auth.userId,
        content: receivable.message,
        room: mongoose.Types.ObjectId(receivable.roomId),
        photo: receivable.photo || null,
        photoUrl: receivable.photoUrl || null
      });
      message.save();

    }

    
    if (socket.handshake.auth.userId === String(room.responder)) {
      room.seenByAuthor = false;
    }
    else if (socket.handshake.auth.userId === String(room.author)) {
      room.seenByResponder = false;
    }
    room.save();
  })
})


io.on("connect_error", (err) => {
  console.log(`connect_error due to ${err.message}`);
});

const uri = 'mongodb+srv://Lobotomy:Micasmu4ka@cluster0.tippd.mongodb.net/FappApp' +
  '?retryWrites=true&w=majority';
// Prints "MongoError: bad auth Authentication failed."
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: true,
  serverSelectionTimeoutMS: 5000
}).catch(err => console.log(err, '  greshka'));

const corsOptions = {
  origin: 'http://localhost:8080/#/login',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}




app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
require('./routes/test.js')(app)
require('./routes/auth.js')(app)
app.use('/', express.static(path.join(__dirname, 'public')))


server.listen(8080)

// Change the 404 message modifing the middleware 
app.use(function (req, res, next) {
  res.status(status.NOT_FOUND).send("Sorry, that route doesn't exist. Have a nice day :)");
});






