var pg = require('pg')

// Creating connection
var connectionString = 'postgres://localhost/ChatDB'
const client = new pg.Client(connectionString);
client.connect();

// Exported databased access functions
module.exports = {

	// Gets all chatroom names
	init : function (callback) {

		query = "SELECT c.name FROM chatrooms c"

		client.query(query, (err, res) => {

			if (err) {
				console.log(err.stack)
				return
			} else {

				return callback(res)
			}
		})
	},

	// Checks if a username is already taken
	userExists : function (username, callback) {

		query = `SELECT u.username FROM users u WHERE u.username = '${username}'`

		client.query(query, (err, res) => {

			if (err) {
				console.log(err.stack)
				return
			} else {

				// If user exists, then the rows of the query will not be empty
				return callback(res)
			}
		})
	},

	createUser : function(username, password, callback) {

		query = `INSERT INTO users (username, password) VALUES ('${username}', '${password}')`

		client.query(query, (err, res) => {

			if (err) {
				console.log(err.stack)
				return
			} else {

				return callback(res)
			}
		})
	},

	// Get all the chat history for a chatroom
	getHistory : function(socketUsername, chatroomName, callback) {

		query = "SELECT m.message, u.username FROM messages m JOIN users u ON m.userid = u.userid WHERE m.chatroomid = (SELECT c.chatroomid FROM chatrooms c WHERE c.name = '" + chatroomName + "')"

		client.query(query, (err, res) => {

			if (err) {
				console.log(err.stack)
				return 
			} else {
				return callback(res)
			}
		})
	},

	// Saves message to database
	saveMessage : function(msg, username, chatroomName) {

		query = "INSERT INTO messages (message, chatroomid, userid) VALUES ('" + msg + "', (SELECT c.chatroomid FROM chatrooms c WHERE c.name = '" + chatroomName + "'), (SELECT u.userid FROM users u WHERE u.username = '" + username + "'))"

		// Save message in DB
		client.query(query, (err, res) => {

			if (err) {
	    		console.log(err.stack)
	  		}
		})
	},

	// Returns last chatroom a user was in if it is a valid login
	handleLogin : function(username, password, callback) {

		var query = "SELECT c.name FROM chatrooms c, users_chatrooms uc, users u WHERE c.chatroomid = uc.chatroomid AND uc.userid = u.userid AND u.username = '" + username + "' AND u.password = '" + password + "'"

		// Save message in DB
		client.query(query, function(err, res) {
			if (err) {
	    		console.log(err.stack)
	    		return
	  		}
	  		
			return callback(res)
		})
	},

	addToRoom : function(username, roomName, isAdmin, callback){


		var query = `INSERT INTO users_chatrooms (userid, chatroomid, is_admin) VALUES ((SELECT u.userid FROM users u WHERE u.username = '${username}'), (SELECT c.chatroomid FROM chatrooms c WHERE c.name = '${roomName}'), '${isAdmin}')`
		
		client.query(query, function(err, res) {
			if (err) {
	    		console.log(err.stack)
	    		return
	  		}
	  		
			return callback(res)
		})
	},

	// Will save the last chat room a user was in when they log out
	saveLastRoom : function(username, chatroomName) {

		var query = "UPDATE users SET lastchatroomid = (SELECT c.chatroomid FROM chatrooms c WHERE c.name = '" + chatroomName + "') WHERE username = '" + username + "'"

		// Save last room in DB
		client.query(query, (err, res) => {

			if (err) {
	    		console.log(err.stack)
	  		}
		})
	},

	createGroup : function(groupName, callback) {

		var query = `INSERT INTO chatrooms (name) VALUES ('${groupName}')`

		client.query(query, (err, res) => {

			if (err) {
	    		console.log(err.stack)
	    		return
	  		}
	  		else {
	  			return callback(true)
	  		}
		})
	},

	isAdmin : function(groupName, username, callback) {

		var query = `SELECT uc.is_admin FROM users_chatrooms uc WHERE uc.userid = (SELECT u.userid FROM users u WHERE u.username = '${username}') AND uc.chatroomid = (SELECT c.chatroomid FROM chatrooms c WHERE c.name = '${groupName}')`

		client.query(query, (err, res) => {

			if (err) {
	    		console.log(err.stack)
	    		return
	  		}
	  		else {
	  			return callback(res)
	  		}
		})
	},

	setAdmin : function(username, groupName, callback) {

		var query = `UPDATE users_chatrooms SET is_admin = 'TRUE' WHERE userid = (SELECT u.userid FROM users u WHERE u.username = '${username}') AND chatroomid = (SELECT c.chatroomid FROM chatrooms c WHERE c.name = '${groupName}')`

		client.query(query, (err, res) => {

			if (err) {
	    		console.log(err.stack)
	    		return
	  		}
	  		else {
	  			return callback(true)
	  		}
		})
	},

	kick : function(username, groupName, callback) {

		var query = `DELETE FROM users_chatrooms WHERE userid = (SELECT u.userid FROM users u WHERE u.username = '${username}') AND chatroomid = (SELECT c.chatroomid FROM chatrooms c WHERE c.name = '${groupName}')`

		client.query(query, (err, res) => {

			if (err) {
	    		console.log(err.stack)
	    		return
	  		}
	  		else {
	  			return callback(true)
	  		}
		})
	}
}