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

	// Get all the chat history for a chatroom, sends it to a user
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

		var query = "SELECT c.name FROM chatrooms c WHERE c.chatroomid = (SELECT u.lastchatroomid FROM users u WHERE u.username = '" + username + "' AND u.password = '" + password + "')"

		// Save message in DB
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
	}
}