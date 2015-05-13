// Application launch
//

// supress EventListener warning
require('events').EventEmitter.prototype._maxListeners = 100;


var smsDaemon = require('./lib/smsserver.js')

smsDaemon.start()
