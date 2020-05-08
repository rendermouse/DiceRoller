let CHANNEL_NAME = 'amakely-dice';
let mult = 1;
let occupants = [];
let uuid = '';
let pubnub;

const exit = (e) => {
  if (pubnub) {
    sendMessage(
      {
        sender: uuid,
        type: 'leave',
        username: myName
      }
    );
  }
}

const multPlus = (e) => {
    mult ++;
    document.getElementById('mult').innerHTML = mult;
}
const multMinus = (e) => {
    mult --;
    document.getElementById('mult').innerHTML = mult;
}

const rollDie = (sides) => {
    return 1 + Math.floor(sides * Math.random());
}

const rollMult = (sides) => {
  let dice = [];
  for (let i = 0; i < mult; i++) {
    dice.push({
      type: 'd' + sides,
      value: rollDie(sides)
    });
  }
  return dice;
}


document.getElementById('multplus').addEventListener('click', multPlus);
document.getElementById('multminus').addEventListener('click', multMinus);
window.addEventListener('unload', exit);


let players = [];
let myName = '';


const submitName = () => {
  myName = document.getElementById('PlayerName').value;
  uuid = 'uuid-' + myName;

  initPubNub();


  // sendMessage(
  //   {
  //     sender: uuid,
  //     type: 'join',
  //     username: myName
  //   }
  // );
  document.getElementById('NamePrompt').style.display = 'none';
  document.getElementById('DiceBar').style.display = 'block';

  pubnub.setState(
    {
      state: {"name": myName},
      channels: [CHANNEL_NAME]
    },
    function (status, response) {
      if (status.isError) {
        console.log('setState: ', status);
      }
      else {
        console.log('setState ', response);

        updateRoster();
      }
    }
  );

  

}

const updateRoster = () => {
  pubnub.hereNow(
    {
      channels: [CHANNEL_NAME],
      includeState: true
    },
    function (status, response) {
      console.log('hereNow ', status, response);
      
      let occupants = response.channels['amakely-dice'].occupants;

      for (let i=0; i< occupants.length; i++) {
        if (occupants[i].state && occupants[i].state.name) {
          addPlayer(occupants[i].uuid, occupants[i].state.name);
        }
      }

    }
  );
}

const addPlayer = (playerid, name) => {

  console.log('>> adding player: ', name, playerid);

  if (players.length > 0 && players.filter((obj) => obj.uuid == playerid).length != 0) {
    // we already have this player
    console.log('>> duplicate player');
    return
  }

  players.push(
    {
      uuid: playerid,
      name: name
    }
  );

  createPlayerBox(name);
  
}

createPlayerBox = (name) => {
  if (document.getElementById('PlayerBox-' + name) == null) {
    console.log('>> adding player box for ', name);

    let playerbox = document.createElement('div');
    playerbox.className = 'playerbox';
    playerbox.id = 'PlayerBox-' + name;
    playerbox.innerHTML = '<p>' + name + '</p>';

    if (name == myName) {
      document.getElementById('PlayerGrid').prepend(playerbox);
    } else {
      document.getElementById('PlayerGrid').appendChild(playerbox);
    }

    let playerRollBox = document.createElement('div');
    playerRollBox.id = 'PlayerRollBox-' + name;
    playerRollBox.className = 'rollbox';
    playerbox.appendChild(playerRollBox);
    
  }

}

const removePlayer = (playerid) => {
  let playerbox = document.getElementById('PlayerBox-' + getPlayer(playerid).name);
  playerbox.remove();
  players.splice(index, 1);
}

const getPlayer = (playerid) => {
  let playerArray = players.map((obj) => obj.uuid);
  let index = playerArray.indexOf(playerid);
  return players[index];
}




const initPubNub = () => {

  pubnub = new PubNub({
    publishKey: "pub-c-33f45c42-77e8-40c4-a39a-56159239da48",
    subscribeKey: "sub-c-4b7791e6-8f49-11ea-8dc6-429c98eb9bb1",
    uuid: uuid,
  });

  pubnub.subscribe(
    {
    channels: [CHANNEL_NAME],
    withPresence: true,
    }
  );
  
  pubnub.addListener(
    {
      message: function (event) {
  
        console.log('>> message: ', event);
  
        switch (event.message.type) {
          case 'join':
            // addPlayer(event.message.sender, event.message.username);
          break;
  
          case 'leave':
            removePlayer(event.message.sender);
          break;
  
          case 'roll':
            let pElement = document.createElement('p');
            let dice = event.message.dice;
            let sum = 0;
            let output = '';
            for (let i=0; i<dice.length; i++) {
              sum += dice[i].value;
              output += dice[i].type + ': ' + dice[i].value + ' ';
            }
            output += ' = ' + sum;
            pElement.appendChild(document.createTextNode(output));
            let playerbox = document.getElementById('PlayerRollBox-' + getPlayer(event.message.sender).name);
            playerbox.innerHTML = '';
            playerbox.appendChild(pElement);
          break;
        }
        
      }
      , presence: function (event) {
        console.log('>> presence: ', event);
        
  
        switch (event.action) {

          case 'join':
            if (event.state && event.state.name) {
              console.log(event.state.name + " has joined.")
              addPlayer(event.uuid, event.state.name);
            }
            
          break;

          case 'leave':
            console.log('>> player is leaving:' + event.uuid);
            removePlayer(event.uuid);
          break;
        }
      }
    }
  );
}


const sendMessage = (message) => {
  pubnub.publish(
    {
      channel: CHANNEL_NAME,
      message: message
    },
    function (status, response) {
    //Handle error here
    }
  );
}

const sendRoll = (sides) => {
  sendMessage(
    {
      sender: uuid,
      type: 'roll',
      dice: rollMult(sides)
    }
  );
}
