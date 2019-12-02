var username
var currentRoom
var isAdmin
var isInPrivateRoom
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

function handleAttachment() {

  console.log('Handling file saving...')

  file = document.getElementById('attachmentFile').files[0]
  
  socket.emit('attachment', {
    'groupname' : $('#newGroupName').val(),
    'attachment' : file
  })

  $('#uploadModal').modal('hide');
}

// Switching between different chatrooms
function switchChatroom(chatroomName, isPrivate) {

  $('.groupItem').removeClass("text-light")
  $('.groupItem').css("background-color", "white")
  $('.groupItem').addClass("shadow")
  $(`#${chatroomName.replace(" ", "_")}`).css("background-color", "#14141f")
  $(`#${chatroomName.replace(" ", "_")}`).addClass("text-light")
  $(`#${chatroomName.replace(" ", "_")}`).removeClass("shadow")

  // Clears the name of the current room and its messages
  $('#currentRoom').empty()
  $('#messages').empty()
  $('#currentImg').empty()

  // Sets name of current room
  src = '../assets/' + chatroomName.replace(" ", "_") + '_icon.png'
  
  if(isPrivate) {
    if(!urlExists(src)) {
      src = '../assets/' + 'profile_placeholder.png'
    }
  }

  $('#currentImg').css({'background-image':`url(${src})`, 'height':'55px', 'width':'55px', 'margin-left':'40px'})
  
  $('#currentRoom').append(chatroomName)

  currentRoom = chatroomName

  isInPrivateRoom = isPrivate

  if (!isPrivate){
    // Joins the room
    socket.emit('switch room', chatroomName)
  } 
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

    if (!isInPrivateRoom){
      // Sending the message
      socket.emit('chat message', 
        {

          'username' : username,
          'message': message

        });
    }

    else {

      console.log("current room " + chatroomName)
      addMessage({'username' : username, 'message' : message})
      socket.emit('private message sent', {'from' : username, 'to' : currentRoom, 'message' : message})
    }

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

    res['message'] = "$leave- Will remove you from the chatroom"
    addMessage(res)

    res['message'] = "$add {username}- Adds a person to the chat"
    addMessage(res)

    res['message'] = "$admin {username}- Gives a person admin privileges"
    addMessage(res)
  }

  else if (splitMsg[0] == "kick") {

    var userToKick = splitMsg[1]

    if (userToKick == username) {

      res['message'] = "Error- you cannot kick yourself, to leave type $leave"
      addMessage(res)
    }

    else {
      socket.emit('remove', {
        'username' : username,
        'userToRemove' : userToKick,
        'roomName' : currentRoom,
        'quietly' : false
      })
    }
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

  else if (splitMsg[0] == "leave") {

    $('#leaveModal').modal('show')
  }

  else {

    res['message'] = "Unknown command, type $help for help"
    addMessage(res)
  }
  
}

function leave() {

  socket.emit('remove', {
    'username' : username,
    'userToRemove' : username,
    'roomName' : currentRoom,
    'quietly' : true
  })
}

function addChatroom(chatroomName, isPrivate) {

  // Icon path and options
  basePath = "../assets/"
  options = `onclick="switchChatroom('${chatroomName}', ${isPrivate})"`

  if (!isPrivate) {
    src = basePath + chatroomName.replace(" ", "_") + '_icon.png'
  }

  else {
    src = basePath + chatroomName.replace(" ", "_") + '_icon.png'
    if(!urlExists(src)) {
      src = basePath + 'profile_placeholder.png'
    }
  }


  html = `
    <div class="groupItem p-2 mb-2 shadow" ${options} id="${chatroomName.replace(" ", "_")}">
      <div class="row">
        <div class="col-sm-3">
          <div class="groupImage rounded-circle bg-light" style="background-position: center center;background-size:cover;background-image:url(${src})">
          </div>
        </div
        <div class="col-sm-9">
          <p class="mt-1 ml-2 standardFont">${chatroomName}</p>
        </div>
      </div>
    </div>`

  // Adding the possible groups to left area
  $('#groups').append(html)
}

// Handles sending private messages between users
function privateMessage(userToMessage) {

  // If user wants to private message themselves
  if (userToMessage == username) {

    var res = {
      'username' : 'AUTO'
    }

    res['message'] = "Error- you cannot message yourself"
    addMessage(res)

    return
  }

  addChatroom(userToMessage, true)

  socket.emit('new private message', {'userToMessage' : userToMessage})
}

function addMessage(info) {

  color = "style="
  spacing = "style='margin-top:2px; margin-bottom:2px;'"
  messagesChildren = document.getElementById("messages").children;
  //if message is from current user
  if (info['username'] == username) {
    //add more spacing if last message was from different sender
    if(messagesChildren.length > 0) {
      if(messagesChildren[messagesChildren.length-1].classList.contains('otherMessage') || messagesChildren[messagesChildren.length-1].classList.contains('autoMessage')) {
        spacing = "style='margin-top:30px; margin-bottom:2px;'"
      }
    }
    html = `<li class="userMessage" ${spacing}><p class="userBubble m-0">${info['message']}</p></li>`
  }
  //if message is automated message
  else if (info['username'] == 'AUTO') {
    color += '"color : red;"'
    userClass = info['username'].replace(" ", "_")
    sender = `<p class="sender p-0" ${color}>${info['username']} </p>`
    messageImg = `<div class="messageImg rounded-circle bg-light" style="background-image: url('../assets/profile_placeholder.png')"></div>`
    margins = "m-0"

    //add more spacing if last message was from different sender
    if(messagesChildren.length > 0) {
      if(messagesChildren[messagesChildren.length-1].classList.contains('otherMessage') || messagesChildren[messagesChildren.length-1].classList.contains('userMessage')) {
        sender = `<li class="senderItem"><p class="sender p-0" style="margin-top:30px;" ${color}>${info['username']}</p></li>`
        messageImg = `<div class="messageImg rounded-circle bg-light" style="background-image: url('../assets/profile_placeholder.png')"></div>`
      }
      //don't display sender if last message was from same person
      if(messagesChildren[messagesChildren.length-1].classList.contains(userClass)) {
        sender = ""
        messageImg = ""
        margins = ""
      }
    }

    html = `${sender}
            <li class="autoMessage">
              ${messageImg}
              <p class="autoBubble ${margins}">${info['message']}</p>
            </li>`
  }
  //if message is from another user in the room
  else{
    color += '"color : black;"'
    userClass = info['username'].replace(" ", "_")
    sender = `<li class="senderItem"><p class="sender p-0" ${color}>${info['username']}</p></li>`
    messageImg = `<div class="messageImg rounded-circle bg-light" style="background-image: url('../assets/profile_placeholder.png')"></div>`
    margins = "m-0"

    //add more spacing if last message was from different sender
    if(messagesChildren.length > 0) {
      if(messagesChildren[messagesChildren.length-1].classList.contains('userMessage') || messagesChildren[messagesChildren.length-1].classList.contains('autoMessage')) {
        sender = `<p class="sender p-0" style="margin-top:30px;" ${color}>${info['username']} </p>`
        if(urlExists(`../assets/${userClass}_icon.png`)) {
          console.log('profile pic exists')
          messageImg = `<div class="messageImg rounded-circle bg-light" style="background-image:url('../assets/${userClass}_icon.png');"></div>`
        }
        else{
          console.log('profile pic not found')
          messageImg = `<div class="messageImg rounded-circle bg-light" style="background-image:url('../assets/profile_placeholder.png');"></div>`
        }
      }
      //don't display sender if last message was from same person
      if(messagesChildren[messagesChildren.length-1].classList.contains(userClass)) {
        sender = ""
        messageImg = ""
        margins = ""
      }
    }

    html = `${sender}
            <li class="otherMessage ${userClass}">
              ${messageImg}
              <p class="otherBubble ${margins}">${info['message']}</p>
            </li>`

  }

  $('#messages').append(html)
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

socket.on('add chatroom', function(info){

  console.log('Received request to add a chatroom')

  if (username == info['username']) {

    addChatroom(info['userToMessage'], true)
  }
})

socket.on('private message', function(info){

  console.log('New private message- ')
  console.log(info)

  // TODO info['from'] == currentRoom
  if (info['to'] == username){

    addMessage({'username' : info['from'], 'message' : info['message']})
  }
})

//check if profile picture for user exists
function urlExists(url) {
    var http = new XMLHttpRequest();
    http.open('HEAD', url, false);
    http.send();
    return http.status!=404;
}

// Valid username/password
socket.on('valid login', function(info){
    
  $('#groups').empty()

  // Removes login page
  $('#loginModal').modal('hide')

  var usernamePath = username.replace(" ", "_");

  if(urlExists(`../assets/${usernamePath}_icon.png`)) {  
    $('#profileImg').css('background-image', `url(../assets/${usernamePath}_icon.png)`);
  }

  // Looping through all the user's chatrooms
  for (var i = 0; i < info['chatrooms'].length; i++) {

    chatroomName = info['chatrooms'][i]
    addChatroom(chatroomName, false)
  }
})

// On receiving a chat message
socket.on('chat message', function(info){

  addMessage(info)
})

// On a user being kicked
socket.on('refresh', function(info){

  // If this user needs to refresh the page
  if (username == info['username'] || info['username'] == 'ALL') {

    location.reload()
  }
})

// Users logging in or out
socket.on('user state update', function(usernames){

  // Clearing active users
  $('#users').empty()


  // Adding the users
  for (var i = 0; i < usernames.length; i++) {
    console.log("ADDING USER")

    option = `"privateMessage('` + usernames[i] + `')"`
    src = `../assets/${usernames[i].replace(" ", "_")}_icon.png`
    alt_src = '../assets/profile_placeholder.png'

    if(urlExists(src)) {  
      html = `
      <div class="userItem p-2 mb-2" id="${usernames[i].replace(" ", "_")}">
        <div class="row">
          <div class="col-sm-3">
            <div class="userImage rounded-circle bg-light" style="background-position: center center;background-size:cover;background-image:url(${src})">
            </div>
          </div>
          <div class="col-sm-6">
            <p class="usersName standardFont">${usernames[i]} 
            <br>
            <span class="online standardFont">Online</span>
            </p>
          </div>
          <div class="col-sm-3">
            <button onclick=${option} class="userButton text-white shadow-sm">DM</button>
          </div>
        </div>
      </div>`
    }
    else {
      html = `
      <div class="userItem p-2 mb-2" id="${usernames[i].replace(" ", "_")}">
        <div class="row">
          <div class="col-sm-3">
            <div class="userImage rounded-circle bg-light" style="background-position: center center;background-size:cover;background-image:url(${alt_src})">
            </div>
          </div>
          <div class="col-sm-6">
            <p class="usersName standardFont">${usernames[i]}
            <br/>
            <span class="online standardFont">Online</span>
            </p>
          </div>
          <div class="col-sm-3">
            <button onclick=${option} class="userButton text-white shadow-sm">DM</button>
          </div>
        </div>
      </div>`
    }

    $('#users').append(html)
  }
})

//update profile picture
function updateProfile() {

  file = document.getElementById('newProfilePic').files[0]

  socket.emit('update profile', {
    'pic' : file
  })
}

// Response for updating profile picture
socket.on('update profile response', function(res){

  // TODO
  if (res != 'success'){

    console.log("Did not successfully update profile picture")
    return
  }

  // Hiding modal and handling page refresh
  console.log("Successfully updated profile picture")
  $('#profileModal').modal('hide');

  var usernamePath = username.replace(" ", "_");
  $('#profileImg').css('background-image', `url(../assets/${usernamePath}_icon.png)`);
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
