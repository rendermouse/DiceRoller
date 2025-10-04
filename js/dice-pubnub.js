const CHANNEL_NAME = "amakely-dice";
const DICE_DELAY = 1500;
let mult = 1;
let uuid = "";
let pubnub;
let disableRoll = false;
let currSound = 3;
let players = [];
let myName = "";

// set up event listeners for clicks
const init = (e) => {
  document.getElementById("multplus").addEventListener("click", multPlus);
  document.getElementById("multminus").addEventListener("click", multMinus);
  window.addEventListener("onbeforeunload", exit);
};

// clean up on browser exit/reload, leave the channel
const exit = (e) => {
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
  uuid = "uuid-" + myName.replace(" ", "-");

  initPubNub();

  document.getElementById("NamePrompt").style.display = "none";
  document.getElementById("DiceBar").style.display = "block";

  updateRoster();
};

// fetch the current roster of players from the channel
const updateRoster = () => {
  pubnub.hereNow(
    {
      channels: [CHANNEL_NAME],
      includeState: true,
    },
    function (status, response) {
      console.log("hereNow ", status, response);

      let occupants = response.channels[CHANNEL_NAME].occupants;

      for (let i = 0; i < occupants.length; i++) {
        if (occupants[i].state && occupants[i].state.name) {
          addPlayer(occupants[i].uuid, occupants[i].state.name);
        }
      }
    }
  );
};

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

const removePlayer = (playerid) => {
  let player = getPlayer(playerid);
  if (player) {
    let playerbox = document.getElementById("PlayerBox-" + player.name);
    playerbox.remove();
    let playerArray = players.map((obj) => obj.uuid);
    let index = playerArray.indexOf(playerid);
    players.splice(index, 1);
  }
};

const getPlayer = (playerid) => {
  let playerArray = players.map((obj) => obj.uuid);
  let index = playerArray.indexOf(playerid);
  return players[index];
};

// initialize pubnub
const initPubNub = () => {
  pubnub = new PubNub({
    publishKey: keys.publishKey,
    subscribeKey: keys.subscribeKey,
    uuid: uuid,
  });

  pubnub.subscribe({
    channels: [CHANNEL_NAME],
    withPresence: true,
  });

  pubnub.addListener({
    message: function (event) {
      console.log(">> message: ", event);

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
          if (event.state && event.state.name) {
            console.log(event.state.name + " has joined.");
            addPlayer(event.uuid, event.state.name);
          }

          break;

        case "leave":
        case "timeout":
          console.log(">> player is leaving or timed out:" + event.uuid);
          removePlayer(event.uuid);
          break;

        case "state-change":
          console.log(">> state change", event.state);
          addPlayer(event.uuid, event.state.name);
          break;
      }
    },
  });

  console.log(">> setting my state");
  pubnub.setState(
    {
      state: { name: myName },
      channels: [CHANNEL_NAME],
    },
    function (status, response) {
      if (status.isError) {
        console.log("setState: ", status);
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
      channel: CHANNEL_NAME,
      message: message,
    },
    function (status, response) {
      //Handle error here
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
