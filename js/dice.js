let CHANNEL_NAME = 'amakely-dice';

let mult = 1;

const exit = (e) => {
  sendMessage(
    {
      sender: uuid,
      type: 'leave',
      username: myName
    }
  );
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
  sendMessage(
    {
      sender: uuid,
      type: 'join',
      username: myName
    }
  );
  document.getElementById('NamePrompt').style.display = 'none';
  document.getElementById('DiceBar').style.display = 'block';

  pubnub.setState(
    {
      state: {"name": myName},
      channels: [CHANNEL_NAME]
    },
    function (status, response) {
      if (status.isError) {
        console.log(status);
      }
      else {
        console.log(response);
      }
    }
  );

  pubnub.hereNow(
    {
      channels: [CHANNEL_NAME],
      includeState: true
    },
    function (status, response) {
      console.log(status, response);
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

  if (document.getElementById('PlayerBox-' + name) == null) {
    console.log('>> adding player box for ', name);

    let playerbox = document.createElement('div');
    playerbox.className = 'playerbox';
    playerbox.id = 'PlayerBox-' + name;
    playerbox.innerHTML = '<p>' + name + '</p>';
    document.getElementById('PlayerGrid').appendChild(playerbox);
  }
  
}

const removePlayer = (playerid) => {
  let playerArray = players.map((obj) => obj.uuid);
  let index = playerArray.indexOf(playerid);
  console.log(index, players[index].name);
  let playerbox = document.getElementById('PlayerBox-' + players[index].name);
  playerbox.remove();
  players.splice(index, 1);
}





const uuid = PubNub.generateUUID();
const pubnub = new PubNub({
  publishKey: "pub-c-33f45c42-77e8-40c4-a39a-56159239da48",
  subscribeKey: "sub-c-4b7791e6-8f49-11ea-8dc6-429c98eb9bb1",
  uuid: uuid,
});

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

var buttons = document.getElementsByClassName('die');
for (let i=0; i<buttons.length; i++) {
  buttons[i].addEventListener("click", (e) => {
    sendMessage(
      {
        sender: uuid,
        type: 'roll',
        dice: rollMult(e.target.getAttribute('data-sides'))
      }
    );
  });
}

    

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
          addPlayer(event.message.sender, event.message.username);
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
          document.body.appendChild(pElement);
        break;
      }
      
    }
    , presence: function (event) {
      console.log('>> presence: ', event);
      console.log(event.uuid + " has joined.")

      switch (event.action) {
        case 'leave':
          console.log('>> player is leaving:' + event.uuid);
          removePlayer(event.uuid);
        break;
      }
    }
  }
);


//   pubnub.history(
//     {
//       channel: 'amakely-dice',
//       count: 10,
//       stringifiedTimeToken: true,
//     },
//     function (status, response) {
//       let pElement = document.createElement('h3');
//       pElement.appendChild(document.createTextNode('historical messages'));
//       document.body.appendChild(pElement);

//       pElement = document.createElement('ul');
//       let msgs = response.messages;
//       for (let i in msgs) {
//         msg = msgs[i];
//         let pElement = document.createElement('li');
//         pElement.appendChild(document.createTextNode('sender: ' + msg.entry.sender + ', content: ' + msg.entry.content));
//         document.body.appendChild(pElement);
//       }
//     }
//   );



