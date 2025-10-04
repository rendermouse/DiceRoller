# DiceRoller
Network socket shared dice roller, using PubNub.

This project requires a PubNub account, with active keys, and Presence support.


You will need a config.js file in the root of your project, with the following contents:

```
var config = {
    pubnub: {
        publishKey: "pub-c-xxxxxxx",
        subscribeKey: "sub-c-xxxxxxxx",
        channelName: "CHANNEL_NAME"
    }
}
```