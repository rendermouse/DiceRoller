const DICE_DELAY = 1500;
let mult = 1;
let uuid = crypto.randomUUID();
let pubnub;
let disableRoll = false;
let currSound = 3;
let players = [];
let myName = "";

// set up event listeners for clicks
const init = (e) => {
  document.getElementById("multplus").addEventListener("click", multPlus);
  document.getElementById("multminus").addEventListener("click", multMinus);
  window.onbeforeunload = exit;
};

// clean up on browser exit/reload, leave the channel
const exit = (e) => {

  alert('>> sending leave message');
  
  if (pubnub) {
    sendMessage({
      sender: uuid,
      type: "leave",
      username: myName,
    });
    pubnub.unsubscribeAll();
  }
};

// add/remove dice
const multPlus = (e) => {
  mult++;
  document.getElementById("mult").innerHTML = mult;
};
const multMinus = (e) => {
  mult--;
  if (mult == 0) mult = 1;
  document.getElementById("mult").innerHTML = mult;
};

// roll a die of given # of sides
const rollDie = (sides) => {
  return 1 + Math.floor(sides * Math.random());
};

// roll multiple dice of given # of sides, return array of results
const rollMult = (sides) => {
  let dice = [];
  for (let i = 0; i < mult; i++) {
    dice.push({
      type: "d" + sides,
      value: rollDie(sides),
    });
  }
  return dice;
};

// join the channel
const submitName = () => {
  myName = document.getElementById("PlayerName").value;

  initPubNub();

  document.getElementById("NamePrompt").style.display = "none";
  document.getElementById("DiceBar").style.display = "block";

  updateRoster();
};

// fetch the current roster of players from the channel
const updateRoster = () => {
  pubnub.hereNow(
    {
      channels: [config.pubnub.channelName],
      includeState: true,
    },
    function (status, response) {
      console.log("hereNow ", status, response);

      let occupants = response.channels[config.pubnub.channelName].occupants;

      for (let i = 0; i < occupants.length; i++) {
        if (occupants[i].state && occupants[i].state.name) {
          addPlayer(occupants[i].uuid, occupants[i].state.name);
        }
      }
    }
  );
};

// add new player to local roster and UI
const addPlayer = (playerid, name) => {
  console.log(">> adding player: ", name, playerid);

  if (
    players.length > 0 &&
    players.filter((obj) => obj.uuid == playerid).length != 0
  ) {
    // we already have this player
    console.log(">> duplicate player");
    return;
  }

  players.push({
    uuid: playerid,
    name: name,
  });

  createPlayerBox(name);
};

createPlayerBox = (name) => {
  if (document.getElementById("PlayerBox-" + name) == null) {
    console.log(">> adding player box for ", name);

    let playerbox = document.createElement("div");
    playerbox.className = "playerbox";
    playerbox.id = "PlayerBox-" + name;
    playerbox.innerHTML = "<p>" + name + "</p>";

    if (name == myName) {
      // MY BOX!  Mine!
      playerbox.className = "playerbox mine";
      document.getElementById("PlayerGrid").prepend(playerbox);
    } else {
      document.getElementById("PlayerGrid").appendChild(playerbox);
    }

    let playerRollBox = document.createElement("div");
    playerRollBox.id = "PlayerRollBox-" + name;
    playerRollBox.className = "rollbox";
    playerbox.appendChild(playerRollBox);
  }
};

// remove player from local roster and UI
const removePlayer = (playerid) => {
  let player = getPlayer(playerid);
  if (player) {
    let playerbox = document.getElementById("PlayerBox-" + player.name);
    try {
      playerbox?.remove();
      let playerArray = players.map((obj) => obj.uuid);
      let index = playerArray.indexOf(playerid);
      players.splice(index, 1);
    } catch (e) { 
      console.log(">> error removing player box: ", e);
    }
  }
};

const getPlayer = (playerid) => {
  let playerArray = players.map((obj) => obj.uuid);
  let index = playerArray.indexOf(playerid);
  return players[index];
};

// initialize pubnub with keys from config
const initPubNub = () => {
  pubnub = new PubNub({
    publishKey: config.pubnub.publishKey,
    subscribeKey: config.pubnub.subscribeKey,
    uuid: uuid,
    // presenceTimeout: 40,
    // heartbeatInterval: 20
  });

  pubnub.subscribe({
    channels: [config.pubnub.channelName],
    withPresence: true,
  });

  pubnub.addListener({
    message: function (event) {
      console.log(">> received message: ", event);

      switch (event.message.type) {
        case "join":
          // addPlayer(event.message.sender, event.message.username);
          break;

        case "leave":
          removePlayer(event.message.sender);
          break;

        case "roll":
          let player = getPlayer(event.message.sender);
          let playerbox = document.getElementById(
            "PlayerRollBox-" + player.name
          );
          let pElement = document.createElement("div");
          pElement.className = "total";
          let dice = event.message.dice;
          let sum = 0;

          playerbox.innerHTML = "";

          for (let i = 0; i < dice.length; i++) {
            sum += dice[i].value;
            let diceEl = drawDie(
              dice[i].type,
              dice[i].value,
              "PlayerRollBox-" + player.name
            );
          }
          pElement.appendChild(document.createTextNode(sum));
          playerbox.appendChild(pElement);

          let snd = document.getElementById("SoundDice" + currSound);
          snd.play();

          currSound++;
          if (currSound > 3) currSound = 1;

          break;
      }
    },
    presence: function (event) {
      console.log(">> presence: ", event);

      switch (event.action) {
        case "join":
          console.log('>> JOIN');
          break;

        case "leave":
        case "timeout":
          console.log(">> player is leaving or timed out:" + event.state.name);
          removePlayer(event.uuid);
          displayMessage(event.state.name == myName ? "You have left the game." : event.state.name + " has left the game.");
          break;

        case "state-change":
          console.log(">> state change", event.state);
          addPlayer(event.uuid, event.state.name);
          var msg = event.state.name == myName ? "You have joined the game." : event.state.name + " has joined the game."
          displayMessage('<p>' + msg + '</p>');
          break;
      }
    },
  });

  console.log(">> setting my state");
  pubnub.setState(
    {
      state: { name: myName },
      channels: [config.pubnub.channelName],
    },
    function (status, response) {
      if (status.isError) {
        console.log("err setState: ", status);
      } else {
        console.log("setState ", response);

        updateRoster();
      }
    }
  );
};

const sendMessage = (message) => {
  pubnub.publish(
    {
      channel: config.pubnub.channelName,
      message: message,
    },
    function (status, response) {
      //Handle error here
      console.log('>> msg error: ', status, response);
    }
  );
};

const sendRoll = (obj, sides) => {
  if (disableRoll) return;

  sendMessage({
    sender: uuid,
    type: "roll",
    dice: rollMult(sides),
  });

  disableRoll = true;
  obj.style.opacity = 0.3;
  setTimeout(function () {
    disableRoll = false;
    obj.style.opacity = 1;
  }, DICE_DELAY);
};

const displayMessage = (text) => {

  console.log('>> display message: ', text);
  
  let msgDiv = document.getElementById("Messages");
  msgDiv.innerHTML = '<p>' + text + '</p>';
  msgDiv.style.display = "block";

  setTimeout( () => {
    msgDiv.innerHTML = '';
    msgDiv.style.display = "none";
  }, 5000);
};


// DICE

const drawDie = (type, value, targetID) => {
  let target = document.getElementById(targetID);
  let diceEl = document.createElement("div");
  diceEl.className = "svg-die";
  diceEl.innerHTML += document
    .getElementById(type + "-template")
    .innerHTML.replace("%%value%%", value);
  target.appendChild(diceEl);
  return diceEl;
};

// init on load
window.addEventListener("load", init);
