/**
 * port:  port server
 * host: host server
 * username: username for authentication
 * password: username's password for authentication
 * events: this parameter determines whether events are emited.
 **/
var ami = new require('asterisk-manager')('5048', '127.0.0.1', 'stoner','amipassword', true); 

// In case of any connectiviy problems we got you coverd.
ami.keepConnected();

// Listen for any/all AMI events.
ami.on('managerevent', function(evt) {
    console.log(evt);
});

// Listen for specific AMI events. A list of event names can be found at
// https://wiki.asterisk.org/wiki/display/AST/Asterisk+11+AMI+Events
ami.on('hangup', function(evt) {});
ami.on('confbridgejoin', function(evt) {});
ami.on('devicestatelistcomplete', function(evt) {
    //console.log(evt);
});

ami.on('FullyBooted', function(evt) {
    console.log(evt);
});

ami.on('PeerStatus', function(evt) {
    console.log(evt);
});

// Listen for Action responses.
ami.on('response', function(evt) {});

// Perform an AMI Action. A list of actions can be found at
// https://wiki.asterisk.org/wiki/display/AST/Asterisk+11+AMI+Actions
ami.action({
  'action':'originate',
  'channel':'SIP/G11U1',
  'context':'default',
  'exten':1234,
  'priority':1,
  'variable':{
    'name1':'value1',
    'name2':'value2'
  }
}, function(err, res) {});
