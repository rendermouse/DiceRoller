# DiceRoller
Network socket shared dice roller, using PubNub

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