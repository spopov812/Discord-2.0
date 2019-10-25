
// Imports
var express = require('express')
var app = express()
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var path = require('path')
var DB = require('./DB')


var chatRoomsToUsers = {}

// Initialize mapping of valid rooms to its active users
DB.init(function(res){

	// Populating dictionary
	for (var i = 0; i < res.rows.length; i++){

		chatRoomsToUsers[res.rows[i]['name']] = []
	}
})

// On a connection to a socket
io.on('connection', function(socket){

	var socketUsername
	var usersChatrooms = []
	var currentChatroom

	// Joining a chatroom
	socket.on('switch room', function(roomName){

		console.log("Room (" + roomName + ") joined by " + socketUsername)

		// If user is in a room (initially a user is not)
		if (currentChatroom != null) {

			// Removing user from current room
			chatRoomsToUsers[currentChatroom] = chatRoomsToUsers[currentChatroom].filter(function(value, index, arr){

			    return value != socketUsername;
			});
		}

		// Updating list of users in chatrooms
		chatRoomsToUsers[roomName].push(socketUsername)

		// Updating the current chat room, setting socket to the room
		currentChatroom = roomName
		socket.join(currentChatroom)

		// Populates screen with user's chat history
		DB.getHistory(socketUsername, currentChatroom, function(res){
			for (var i = 0; i < res.rows.length; i++){
				socket.emit('chat message', res.rows[i]['username'] + "- " + res.rows[i]['message'])
			}
		})

		io.to(currentChatroom).emit('user state update', chatRoomsToUsers[currentChatroom])

		console.log("Chatroom layout- ")
		console.log(chatRoomsToUsers)
	})

	socket.on('disconnect', function(){

		if (currentChatroom == null) {
			return
		}

		console.log(socketUsername + " has left the " + currentChatroom + " room")

		chatRoomsToUsers[currentChatroom] = chatRoomsToUsers[currentChatroom].filter(function(value, index, arr){

		    return value != socketUsername;
		});

		io.to(currentChatroom).emit('user state update', chatRoomsToUsers[currentChatroom])
	})

	// On receiving a chat message
	socket.on('chat message', function(info){

		// Save message in DB
		DB.saveMessage(info['message'], socketUsername, currentChatroom)

		console.log("Sending message- " + info['message'] + " to chatroom- " + currentChatroom)

		// Sends message back to html to display it
		io.to(currentChatroom).emit('chat message', info['username'] + "- " + info['message']);
	})

	// Initializing the user's info on login
	socket.on('user connect', function(info){
		
		// Querying DB if login is valid
		DB.handleLogin(info['username'], info['password'], function(res){

			// Invalid login
			if (res.rows === undefined || res.rows.length == 0) {

				console.log("Invalid login")
			}

			// Valid login
			else{

				for (var i = 0; i < res.rows.length; i++) {

					usersChatrooms.push(res.rows[i]['name'])
				}

				// Sets the name of the socket
				socketUsername = info['username']

				console.log(socketUsername + " has joined the chatroom\n")

				// Transitions user to chat page, passes back the user's chatrooms
				socket.emit('valid login', 
					{
						'chatrooms' : usersChatrooms
					})
			}
		})
	})
});

// HTTP server listening
http.listen(port, function(){
  console.log('listening on *:' + port);
});

app.use(express.static(path.join(__dirname, 'public')));

// Initial page
app.get('/', function(req, res){
  res.sendFile(__dirname + '/views/index.html');
});
