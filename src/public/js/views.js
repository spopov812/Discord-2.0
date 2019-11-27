var username
var currentRoom
var isAdmin
var socket = io()

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

  socket.emit('create group', {
    'groupname' : $('#newGroupName').val(),
    'icon' : file
  })
}

// Switching between different chatrooms
function switchChatroom(chatroomName) {

  $('.groupItem').removeClass("text-light")
  $('.groupItem').css("background-color", "white")
  $('.groupItem').addClass("shadow")
  $(`#${chatroomName}`).css("background-color", "#14141f")
  $(`#${chatroomName}`).addClass("text-light")
  $(`#${chatroomName}`).removeClass("shadow")

  // Clears the name of the current room and its messages
  $('#currentRoom').empty()
  $('#messages').empty()
  $('#currentImg').empty()

  // Sets name of current room
  src = '../assets/' + chatroomName + '_icon.png'
  $('#currentImg').css({'background-image':`url(${src})`, 'height':'55px', 'width':'55px', 'margin-left':'40px'})
  chatroomName = chatroomName.replace("_", " ")
  $('#currentRoom').append(chatroomName)

  currentRoom = chatroomName

  // Joins the room
  socket.emit('switch room', chatroomName)
}

// On submitting a chat message
function sendMessage(ele) {

  // Enter hit for message send
  if(event.key === 'Enter') {

    // Parsing $ commands
    var message = $('#m').val()

    if (message[0] == '$'){
      $('#m').val('')
      handleCommand(message.substring(1))
      return
    }

    // Sending the message
    socket.emit('chat message', 
      {

        'username' : username,
        'message': message

      });

    // Clearing message from input bar
    $('#m').val('')
    return false
  }     
}

function handleCommand(message) {

  var res = {
    'username' : 'AUTO'
  }

  var splitMsg = message.split(" ")

  if (splitMsg[0] == "help") {

    res['message'] = "$help- Displays this message"
    addMessage(res)

    res['message'] = "$kick {username}- Kicks a person from the chat"
    addMessage(res)

    res['message'] = "$add {username}- Adds a person to the chat"
    addMessage(res)

    res['message'] = "$admin {username}- Gives a person admin privileges"
    addMessage(res)
  }

  else if (splitMsg[0] == "kick") {

    var userToKick = splitMsg[1]

    socket.emit('kick', {
      'username' : username,
      'userToKick' : userToKick,
      'roomName' : currentRoom
    })
  }

  else if (splitMsg[0] == "add") {

    var userToAdd = splitMsg[1]
    
    socket.emit('add to room', {
      'username' : username,
      'userToAdd' : userToAdd,
      'roomName' : currentRoom
    })
  }

  else if (splitMsg[0] == "admin") {

    var userToAdmin = splitMsg[1]

    socket.emit('set admin', {
      'username' : username,
      'userToAdmin' : userToAdmin,
      'roomName' : currentRoom
    })
  }

  else {

    res['message'] = "Unknown command, type $help for help"
    addMessage(res)
  }
  
}

function addMessage(info) {

  color = "style="

  if (info['username'] == username) {

    color += '"color : green;"'
  }

  else if (info['username'] == 'AUTO') {

    color += '"color : red;"'
  }

  else{
    color += '"color : black;"'
  }

  html = `<li class="p-0"><p class="p-0 m-0" ${color}>${info['username']}- </p><p class="p-0 m-0">${info['message']}</p></li><hr class="m-1" />`

  $('#messages').append(html)
  window.scrollTo(0, document.body.scrollHeight)
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


    //html = `<img src="${src}" ${options} id="${chatroomName}" /><h4>${chatroomName}</h4><hr />`

    html = `<div class="groupItem p-2 mb-2 shadow" ${options} id="${chatroomName.replace(" ", "_")}"><div class="row no-gutters"><div class="col-sm-2"><div class="groupImage rounded-circle bg-light" style="background-position: center center;background-size:cover;background-image:url(${src})"></div></div><div class="col-sm-9"><p class="mt-1 ml-4 chatroomName">${chatroomName}</p></div></div></div>`

    // Adding the possible groups to left area
    $('#groups').append(html)
  }
})

// On receiving a chat message
socket.on('chat message', function(info){

  addMessage(info)
})

// On a user being kicked
socket.on('refresh', function(info){

  // If this user needs to refresh the page
  if (username == info['username']) {

    location.reload()
  }
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

// automatically scroll to bottom of messages @ new message
function addObserverIfDesiredNodeAvailable() {

    var elementToObserve = document.querySelector("#messages");
    if(!elementToObserve) {
        //The node we need does not exist yet.
        //Wait 500ms and try again
        window.setTimeout(addObserverIfDesiredNodeAvailable,500);
        return;
    }
    var observer = new MutationObserver(function() {
      elementToObserve.scrollTop = elementToObserve.scrollHeight;
    });

    var config = {childList: true};
    observer.observe(elementToObserve,config);
}
addObserverIfDesiredNodeAvailable();
