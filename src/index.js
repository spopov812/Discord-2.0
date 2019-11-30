
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
	})

	// Socket listening for when a user leaves the site
	socket.on('disconnect', function(){

		// If the user was not a part of a chatroom
		if (currentChatroom == null) {
			return
		}

		console.log(socketUsername + " has left the " + currentChatroom + " room")

		// Updating the list of rooms to users
		chatRoomsToUsers[currentChatroom] = chatRoomsToUsers[currentChatroom].filter(function(value, index, arr){

		    return value != socketUsername;
		});

		// Updates the panel of active users
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

	socket.on('new private message', function(info) {

		var userToMessage = info['userToMessage']

		io.emit('add chatroom', {'username' : userToMessage, 'userToMessage' : socketUsername})
	})

	socket.on('private message sent', function(info) {

		console.log('received request for new private message')
		console.log(info)

		io.emit('private message', {'from' : socketUsername, 'to' : info['to'], 'message' : info['message']})
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

				DB.addToRoom(info['username'], 'General', 1, function(res) {

					socket.emit('create account response', 'success')
				})
			})
		})
	})

	// Person adding a user to a room
	socket.on('add to room', function(info){

		// Checking if is admin
		DB.getAdminLevel(info['roomName'], info['username'], function(res){

			// If the user is at admin level 1, do not let them add people
			if (res.rows[0].admin_level == 1) {

				// Notify user
				socket.emit('chat message', 
				{

					'username' : 'AUTO',
					'message' : 'You are not authorized to add people'
				})

				return
			}

			// If they are authorized to do so, add the user to the room
			DB.addToRoom(info['userToAdd'], info['roomName'], 1, function(res) {

				console.log(`Adding ${info['userToAdd']} to ${info['roomName']}`)

				// Emits update to whole chatroom
				io.to(currentChatroom).emit('chat message', {
					'username' : 'AUTO',
					'message' : `${info['userToAdd']} has joined the chat!`
				});

				io.emit('refresh', {'username' : info['userToAdd']})
			})
		})	
	})

	// Socket listening for which admin to set in the group
	socket.on('set admin', function(info){

		// Checking if is admin
		DB.getAdminLevel(info['roomName'], info['username'], function(personSetting){

			// If the user is at admin level 1, do not let them set privileges
			if (personSetting.rows[0].admin_level == 1) {

				// Notify user
				socket.emit('chat message', 
				{

					'username' : 'AUTO',
					'message' : 'You are not authorized to set admin'
				})

				return
			}

			DB.getAdminLevel(info['roomName'], info['userToAdmin'], function(personBeingSet){

				// If the two people are on the same privilege level
				if (personSetting.rows[0].admin_level == personBeingSet.rows[0].admin_level) {

					// Notify user
					socket.emit('chat message', 
					{

						'username' : 'AUTO',
						'message' : 'You can only give admin privileges to people lower than your level'
					})

					return
				}

				// Updating the admin privilege to 2 in the database
				DB.setAdminLevel(info['userToAdmin'], info['roomName'], 2, function(res){

					// Sending message to the chatroom of the update
					io.to(currentChatroom).emit('chat message', {
						'username' : 'AUTO',
						'message' : `${info['userToAdmin']} has been set as an admin by ${info['username']}`
					});
				})
			})
		})
	})

	// Socket listening for the user to be removed
	socket.on('remove', function(info){

		var removingSelf = info['username'] == info['userToRemove']

		// Checking if is admin
		DB.getAdminLevel(info['roomName'], info['username'], function(personRemoving){

			// If the user is not at admin level, do not let them kick people
			// If user is not trying to remove themselves (leave group)
			if (personRemoving.rows[0].admin_level == 1 && !removingSelf) {

				// Notify user
				socket.emit('chat message', 
				{

					'username' : 'AUTO',
					'message' : 'You are not authorized to kick users'
				})

				return
			}

		// Getting the admin privelege level of the user to remove
		DB.getAdminLevel(info['roomName'], info['userToRemove'], function(personToRemove){

				// If the users are at the same admin level, do not kick
				// If user is not trying to remove themselves (leave group)
				if (personRemoving.rows[0].admin_level == personToRemove.rows[0].admin_level && !removingSelf) {

					// Notify user
					socket.emit('chat message', 
					{

						'username' : 'AUTO',
						'message' : 'You cannot kick other admins'
					})

					return
				}

				// Updating the removal in the database
				DB.kick(info['userToRemove'], info['roomName'], function(res){

					if (!info['quietly']) {
						// Sends message to room about the update
						io.to(currentChatroom).emit('chat message', {
							'username' : 'AUTO',
							'message' : `${info['userToRemove']} has been kicked by ${info['username']}`
						});
					}

					// Admin deleting group
					if(removingSelf && personRemoving.rows[0].admin_level == 3) {

						DB.deleteGroup(info['roomName'], function(res) {

							// Sends message to all users of the username that was kicked. That users page will refresh
							io.to(currentChatroom).emit('refresh', {'username' : 'ALL'})
							return
						})
					}

					// Sends message to all users of the username that was kicked. That users page will refresh
					io.to(currentChatroom).emit('refresh', {'username' : info['userToRemove']})
				})
			})
		})
	})

	// Socket listening for when a group is to be created
	socket.on('create group', function(info){

		var groupName = info['groupname']
		var groupNamePath = groupName.replace(' ', '_')

		// Writing the icon to disk
		fs.writeFile(`./src/public/assets/${groupNamePath}_icon.png`, new Buffer(info['icon'], "base64"), function(err) {
	       if(err){
	            console.log("Error: ", err)
	            return
	       }
	       console.log("image converted and saved to dir")
	  	})

		// Save the group in the database
		DB.createGroup(groupName, function(res){

			console.log("Created new group with name: " + groupName)

			// Adding the user that created the group
			DB.addToRoom(socketUsername, groupName, 3, function(res) {

				console.log("Adding " + socketUsername + " to new " + groupName)

				// Updating list of groups to users
				usersChatrooms.push(groupName)
				chatRoomsToUsers[groupName] = []

				// Updating html page for the update
				socket.emit('valid login', 
				{
						'chatrooms' : usersChatrooms
				})

				// Successfully created the group
				socket.emit('create group response', 'success')
			})
		})
	})

	socket.on('attachment', function(info){

		console.log('Saving file')

		filename = Math.floor(Math.random() * 1000) + 1

		// Writing the icon to disk
		fs.writeFile(`./src/public/assets/${filename}`, new Buffer(info['attachment'], "base64"), function(err) {
	       if(err){
	            console.log("Error: ", err)
	            return
	       }
	       console.log('File saved')
	  	})

		message = `<img src="../assets/${filename}">`

		DB.saveMessage(message, socketUsername, currentChatroom)

	  	io.to(currentChatroom).emit('chat message', {'username' : socketUsername, 'message' : message})
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
