const express = require('express');
const app = express();
const server = require('http').createServer(app)
const io = require('socket.io')(server, { origins: '*:*', wsEngine: 'ws' });
const fs = require('fs');
const status = require('http-status');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const salt = bcrypt.genSaltSync(10);

const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const { check, validationResult } = require('express-validator');

mongoose.Promise = global.Promise;


const uri = 'mongodb+srv://Lobotomy:Micasmu4ka@cluster0.tippd.mongodb.net/FappApp' +
  '?retryWrites=true&w=majority';
// Prints "MongoError: bad auth Authentication failed."
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useUnifiedTopology:true,
  useCreateIndex:true,
  useFindAndModify:true,
  serverSelectionTimeoutMS: 5000
}).catch(err => console.log(err, '  greshka'));



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const Client = server.listen(3005)
io.origins('*:*')


//Models

const userSchema = new mongoose.Schema({  
  email: {type:String, unique: true, required:true},
  username: {type:String, unique: true, required:true},
  password:{type:String, required:true}
});

let User = mongoose.model('User', userSchema);  


var msgSchema = new Schema({

  content: {
    type: String,
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  senderId: {
    type: String,
    required: true
  },
  room: {
    type: String,
    required: true
  },
  sendDate: {
    type: Date,
    required: true,
    default: Date.now()
  }

})

var roomSchema = new Schema({
  namespace: {
    type: String,
    required: true
  },
  name: {
    type: String,
    default: "name"
  }
})

const Message = mongoose.model('Message', msgSchema);

const Room = mongoose.model('Room', roomSchema)








var test = io.of('/chat')


app.get('/static', function (req, res, next) {
  res.sendFile(__dirname + '/index.html')
})

app.get('/test', function (req, res, next) {
  res.sendFile(__dirname + '/bootchat.html')
})


app.get('/styles', function (req, res, next) {
  res.sendFile(__dirname + '/bootchat.css')
})

app.post('/register', [check('username').isLength({min:5}),check('password').isLength({min:6}),
check('email').isEmail()], function(req,res) {

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(status.UNPROCESSABLE_ENTITY).json({ errors: errors.array() })
    }
    const user = new User();
    console.log(req.body,  '  body')
    user.email = req.body.email;
    user.username = req.body.username;

    var hash = bcrypt.hashSync(req.body.password, salt);
    user.password = hash;

    user.save((err,user) => {
        if(err){
            return res.status(status.UNPROCESSABLE_ENTITY).json({errors:err})
        }
        
        return res.status(status.OK).json({user})
    })
    
})


app.post('/login',  [check('password').isLength({min:6})], function(req,res){
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
      return res.status(status.UNPROCESSABLE_ENTITY).json({ errors: errors.array() })
  }

  const username = req.body.username || req.body.email;
  const password = req.body.password;

  if(!username || !password){
      return res.status(status.UNPROCESSABLE_ENTITY).json({message:"Wrong Username or Password"})
  }

  

  User.findOne({$or:[{username:username}, {email:username}]}, (err, user) => {
      if(err){
          return res.status(status.UNPROCESSABLE_ENTITY).json({err:err})
      }
      else if (!user){
          return res.status(status.UNPROCESSABLE_ENTITY).json({err:err});
      }
      else{
          console.log(user);
          const check = bcrypt.compareSync(password, user.password);
          if(check){
              jwt.sign({user},'muhatacece', (err, token) => {
                  if(err){
                      return res.status(status.UNPROCESSABLE_ENTITY).json({err:err});
                  }
                  return res.status(status.OK).json({token}) 
              })
          }
          else{
              return res.status(status.UNAUTHORIZED).jsoN({err:"Wrong Username or Password"})
          }

      }
  })
})

// Change the 404 message modifing the middleware
app.use(function(req, res, next) {
  res.status(status.NOT_FOUND).send("Sorry, that route doesn't exist. Have a nice day :)");
});

test.on('connection', function (socket) {
  fullProcess(socket)
});


function validateUser(req,res,next){
  const bearerHeader = req.headers['authorization'] || "";
  const bearerToken = bearerHeader.split(' ')[1];
  if(typeof bearerHeader !== 'undefined'){
      req.token = bearerToken;

      next();
  }else{
      return res.status(403).json({message:"Forbidden"})
  }
}

function fullProcess(socket) {
  socket.on('joinroom', function (data) {
    console.log('vliza v joinRoom')
    Object.keys(socket.rooms).forEach(function (key) {
      socket.leave(key);
      // do something with obj[key]
    });
    Room.findOne({ namespace: data.secret, name: data.room }).exec(function (error, res) {
      if (!res) {
        let rm = new Room({ namespace: data.secret, name: data.room })
        data.secret = data.secret.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        data.room = data.room.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        rm.save().catch()
      }

      socket.join(data.room)
      socket.currentRoom = data.room;
      console.log(data.room , '   come here')
      if (res) {
        // Message.find({project:data.secret,room:data.room}).sort({sendDate:-1}).limit(50).sort({sendDate:1}).exec(function(err,result){
        //       socket.emit('history', {result})      
        // })
        //, {$limit:20}, {$sort:{sendDate:-1}}
        Message.aggregate([{ $match: {  room: data.room.toString() } }, { $sort: { sendDate: -1 } }, { $limit: 20 }
          , { $sort: { sendDate: 1 } }]).exec(function (err, result) {
            socket.emit('history', { result })
          })
      }
    })
  })


  //Message

  socket.on('messageToServer', function (data) {
    console.log('vliza v msg wtf', data),
    io.of(test.name).in(socket.currentRoom).emit('messageToClient', { content: data.content, senderName: data.senderName, senderId: data.senderId })
    data.content = data.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let msg = new Message({ content: data.content, senderId: data.senderId, senderName: data.senderName, project: data.secret, room: data.room, sendDate: new Date() });
    console.log('tuka stiga')
    msg.save((err, meseg) => {
      console.log(err, ' err   ', meseg)
    })
  });
}




