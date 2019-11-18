var username
var socket = io()

module.exports = {

  // Creating a name
  submitLogin : function () {
    
    username = $('#usernameInput').val()

    // Lets server know this users username
    socket.emit('user connect', 
      {
        'username' : $('#usernameInput').val(),
        'password' : $('#passwordInput').val()
      }
    )   
  }

}
