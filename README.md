# DiceRoller
This is a socket-based shared dice roller, using PubNub. 
It allows multiple people to join a room and roll dice together.

This is a small, hobby project built with no JS frameworks, other than the PubNub SDK.

This project requires at least a free-tier PubNub account, with an active keyset, and all Presence support features enabled.

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