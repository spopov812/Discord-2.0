var username
var socket = io();

// Creating a name
function submitLogin() {
        
  username = $('#usernameInput').val()

  // Lets server know this users username
  socket.emit('user connect', 
    {
      'username' : $('#usernameInput').val(),
      'password' : $('#passwordInput').val()
    }
  )   
}

// Handles account creation
function createAccount() {

  // Getting fields
  usernameLocal = $('#usernameCreate').val()
  password = $('#passwordCreate').val()
  passwordRe = $('#passwordCreateRe').val()

  console.log(`Pass: ${password}, PassRe: ${passwordRe}`)

  // If pasword retype matches
  if (password != passwordRe){

    // Show error
    $('#passMatch').show()
    $('#userExists').hide()
    return false
  }

  else{

    $('#passMatch').hide()
  }

  socket.emit('create account', 
  {
    'username' : usernameLocal,
    'password' : password
  })
}

function createGroup() {

  file = document.getElementById('newGroupIcon').files[0]
  console.log(file)
  //fetch('/upload/image', {method: "POST", body: {'image' : file}});
  socket.emit('create group', $('#newGroupName').val())
}

// Switching between different chatrooms
function switchChatroom(chatroomName) {

  $('.groupItem').removeClass("text-light")
  $('.groupItem').css("background-color", "white")
  $('.groupItem').addClass("shadow")
  $('.groupItem').removeClass("current-room")
  $(`#${chatroomName}`).css("background-color", "#14141f")
  $(`#${chatroomName}`).addClass("text-light")
  $(`#${chatroomName}`).removeClass("shadow")
  $(`#${chatroomName}`).addClass("current-room")

  // Clears the name of the current room and its messages
  $('#currentRoom').empty()
  $('#messages').empty()

  // Sets name of current room
  chatroomName = chatroomName.replace("_", " ")
  $('#currentRoom').append(chatroomName)

  // Joins the room
  socket.emit('switch room', chatroomName)
}

// On submitting a chat message
function sendMessage(ele) {

  // Enter hit for message send
  if(event.key === 'Enter') {

    console.log("Sending message from " + username)

    // Sending the message
    socket.emit('chat message', 
      {

        'username' : username,
        'message': $('#m').val()

      });

    // Clearing message from input bar
    $('#m').val('')
    return false
  }     
}

socket.on('create account response', function(res){

  if (res == "username exists") {

    $('#userExists').show()
  }

  if (res == "success") {

    console.log('Successfully created a new user account')

    $('#userExists').hide()
    $('#passMatch').hide()

    username = $('#usernameCreate').val()

    console.log("Sending user connect message with values " + $('#usernameCreate').val() + " and " + $('#passwordCreate').val())

    socket.emit('user connect', 
    {
      'username' : $('#usernameCreate').val(),
      'password' : $('#passwordCreate').val()
    }
  )   
  }
})

// Response for group creation
socket.on('create group response', function(res){

  // TODO
  if (res != 'success'){

    console.log("Did not successfully createa a new group")
    return
  }

  // Hiding modal and handling page refresh
  console.log("Successfully created a new group")
  $('#createModal').modal('hide');

})

// Valid username/password
socket.on('valid login', function(info){
          
  $('#groups').empty()

  // Removes login page
  $('#loginModal').modal('hide')

  // Icon path and options
  base_path = "../assets/"
  options = 'onclick="switchChatroom(this.id)"'

  // Looping through all the user's chatrooms
  for (var i = 0; i < info['chatrooms'].length; i++) {

    chatroomName = info['chatrooms'][i]
    src = base_path + chatroomName.replace(" ", "_") + '_icon.png'

    html = `<div class="groupItem p-2 mb-2 shadow" ${options} id="${chatroomName.replace(" ", "_")}"><div class="row groupRow"><div class="col-sm-4"><div class="groupImage rounded-circle bg-light" style="background-position: center center;background-size:cover;background-image:url(${src})"></div></div><div class="col-sm-8"><h4>${chatroomName}</h4></div></div></div>`
    console.log("Setting html- " + html)

    // Adding the possible groups to left area
    $('#groups').append(html)
  }
})

// On receiving a chat message
socket.on('chat message', function(info){

  color = "style="

  if (info['username'] == username) {
    color += '"color : green;"'
  }

  else{
    color += '"color : black;"'
  }

  html = `<li class="p-0"><p class="p-0 m-0" ${color}>${info['username']}- </p><p class="p-0 m-0">${info['message']}</p></li><hr class="m-1" />`

  $('#messages').append(html)
  window.scrollTo(0, document.body.scrollHeight)
})

// Users logging in or out
socket.on('user state update', function(usernames){

  // Clearing active users
  $('#users').empty()

  // Adding the users
  for (var i = 0; i < usernames.length; i++) {
    $('#users').append($('<h4 id="' + usernames[i] + '">').text(usernames[i]))
  }
})