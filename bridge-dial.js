/*jshint node:true*/
'use strict';

var ari = require('ari-client');
var util = require('util');


ari.connect('http://localhost:8088', 'asterisk', 'asterisk', clientLoaded);

// handler for client being loaded
function clientLoaded (err, client) {
  if (err) {
    throw err;
  }

  // handler for StasisStart event
  function stasisStart(event, channel) {
    // ensure the channel is not a dialed channel
    var dialed = event.args[0] === 'dialed';

    if (!dialed) {
      channel.answer(function(err) {
        if (err) {
          throw err;
        }

        console.log('Channel %s has entered our application', channel.name);

        var playback = client.Playback();
        channel.play({media: 'sound:ring'},
          playback, function(err, playback) {
            if (err) {
              throw err;
            }
        });

        console.log('Calling originate...');
        originate(channel);
      });
    }
  }

  function originate(channel) {
    var dialed = client.Channel();

    channel.on('StasisEnd', function(event, channel) {
      hangupDialed(channel, dialed);
    });

    channel.on('ChannelDestroyed', function(event, channel) {
      hangupOriginal(channel, dialed);
    });

    dialed.on('ChannelDestroyed', function(event, dialed) {

      hangupOriginal(channel, dialed);
    });


    dialed.on('StasisStart', function(event, dialed) {

        dialed.on('ChannelStateChange', channelStateChange);

        console.log('Dialed channel enter StasisStart');
      joinMixingBridge(channel, dialed);
    });

    console.log('Dialed originate...');
    dialed.originate(
      {endpoint: 'SIP/G11U2/20641244570', app: 'channel', appArgs: 'dialed'},
      function(err, dialed) {
        if (err) {
          throw err;
        }
    });

    dialed.record({name: 'testrecording', format: 'wav', beep: true, ifExists: 'overwrite'}, function(err, liverecording) {});
  }

  // handler for original channel hanging up so we can gracefully hangup the
  // other end
  function hangupDialed(channel, dialed) {
    console.log(
      'Channel %s left our application, hanging up dialed channel %s',
      channel.name, dialed.name);

    // hangup the other end
    dialed.hangup(function(err) {
      // ignore error since dialed channel could have hung up, causing the
      // original channel to exit Stasis
    });
  }

  // handler for the dialed channel hanging up so we can gracefully hangup the
  // other end
  function hangupOriginal(channel, dialed) {
    console.log('Dialed channel %s has been hung up, hanging up channel %s',
      dialed.name, channel.name);

    // hangup the other end
    channel.hangup(function(err) {
      // ignore error since original channel could have hung up, causing the
      // dialed channel to exit Stasis
    });
  }

  // handler for dialed channel entering Stasis
  function joinMixingBridge(channel, dialed) {
    var bridge = client.Bridge();

    dialed.on('StasisEnd', function(event, dialed) {
      dialedExit(dialed, bridge);
    });

    dialed.answer(function(err) {
      if (err) {
        throw err;
      }
    });

    bridge.create({type: 'mixing'}, function(err, bridge) {
      if (err) {
        throw err;
      }

      console.log('Created bridge %s', bridge.id);

      addChannelsToBridge(channel, dialed, bridge);
    });
  }

  // handler for the dialed channel leaving Stasis
  function dialedExit(dialed, bridge) {
    console.log(
        'Dialed channel %s has left our application, destroying bridge %s',
        dialed.name, bridge.id);

    bridge.destroy(function(err) {
      if (err) {
        throw err;
      }
    });
  }

  // handler for new mixing bridge ready for channels to be added to it
  function addChannelsToBridge(channel, dialed, bridge) {
    console.log('Adding channel %s and dialed channel %s to bridge %s',
        channel.name, dialed.name, bridge.id);

    bridge.addChannel({channel: [channel.id, dialed.id]}, function(err) {
      if (err) {
        throw err;
      }
    });
  }

  // Handler for ChannelStateChange event
  function channelStateChange(event, channel) {
    console.log(util.format('Channel %s is now: %s', channel.name, channel.state));
  }


  client.on('StasisStart', stasisStart);
  client.on('ChannelStateChange', channelStateChange);

  client.start('channel');
}
