var express = require('express')
var app = express()
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var pg = require('pg')
var path = require('path')

var connectionString = 'postgres://localhost/ChatDB'
const client = new pg.Client(connectionString);
client.connect();

function getHistory(socket) {

	query = 'SELECT name FROM testtable'

	client.query(query, (err, res) => {
		if (err) {
			console.log(err.stack)
		} else {
			for (var i = 0; i < res.rows.length; i++){
				socket.emit('chat message', res.rows[i]['name'])
			}
		}
})
}

function saveMessage(msg) {

	query = 'INSERT INTO testtable (name) VALUES (\'' + msg + '\')'

	// Save message in DB
	client.query(query, (err, res) => {
		if (err) {
    		console.log(err.stack)
  		}
	})
}

// On a connection to a socket
io.on('connection', function(socket){

	// Populates screen with user's chat history
	getHistory(socket)

	// On receiving a chat message
	socket.on('chat message', function(msg){

		saveMessage(msg)

		// Sends message back to html to display it
		io.emit('chat message', msg);
	});
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
