
// Imports
var express = require('express')
var app = express()
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
const fs = require('fs')
var path = require('path')
var DB = require('./DB')

global.Buffer = global.Buffer || require('buffer').Buffer

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
				socket.emit('chat message', 
				{

					'username' : res.rows[i]['username'],
					'message' : res.rows[i]['message']
				})
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
		io.to(currentChatroom).emit('chat message', {
			'username' : info['username'],
			'message' : info['message']
		});
	})

	// Initializing the user's info on login
	socket.on('user connect', function(info){
		
		// Querying DB if login is valid
		DB.handleLogin(info['username'], info['password'], function(res){

			console.log("Response from user connect is ", res.rows)

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

	// Channel for account creation
	socket.on('create account', function(info){

		// Checks if the username is already taken
		DB.userExists(info['username'], function(res){


			// Rows should be empty if the username is not taken
			if (res.rows.length != 0) {

				console.log("Username already exists")
				socket.emit('create account response', "username exists")
				return
			}

			console.log("Creating a new user")

			// Creates actual user
			DB.createUser(info['username'], info['password'], function(res){

				DB.addToRoom(info['username'], 'General', function(res) {

					socket.emit('create account response', 'success')
				})
			})
		})
	})

	socket.on('add to room', function(info){

		console.log(`Adding ${info['username']} to ${info['roomName']}`)

		DB.addToRoom(info['username'], info['roomName'], function(res) {

			return
		})
	})

	socket.on('create group', function(info){

		console.log(info['icon'])

		var groupName = info['groupname']

		// Writing the icon to disk
		fs.writeFile(`./src/public/assets/${groupName}_icon.png`, new Buffer(info['icon'], "base64"), function(err) {
	       if(err){
	            console.log("Error: ", err)
	            return
	       }
	       console.log("image converted and saved to dir")
	  	})

		DB.createGroup(groupName, function(res){

			console.log("Created new group with name: " + groupName)

			DB.addToRoom(socketUsername, groupName, function(res) {

				console.log("Adding " + socketUsername + " to new " + groupName)

				usersChatrooms.push(groupName)

				chatRoomsToUsers[groupName] = []

				socket.emit('valid login', 
				{
						'chatrooms' : usersChatrooms
				})

				socket.emit('create group response', 'success')

			})
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
console.log("Listening :)")
  res.sendFile(__dirname + '/views/index.html');
});
