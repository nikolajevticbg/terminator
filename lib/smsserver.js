/**
 * lib/smsserver.js
 */

const PORT = 44444;
const HOST = '10.0.0.1';

var models = require('../models')
var inspect = require('util').inspect;
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
var sendidcount = 1;


/*
 * smsserver log function
 */
function log(msg) {
    console.log("SMS server: " + msg)
}


/*
 * Server send message function
 */
function sendMessage(msg, address, port) {
    server.send(msg, 0, msg.length, port, address);
    log(msg)
}

/*
 * Parse parameter value
 */
function parseParameterValue(param){
    return param.substring(param.indexOf(":")+1, param.length);
}



/*
 * Server listening function
 */
server.on('listening', function () {
    var address = server.address();
    log('UDP Server listening on ' + address.address + ":" + address.port);
});


/*
 * Server receive function
 */
server.on('message', function (message, remote) {
    message = message.toString();
    log(remote.address + ':' + remote.port +' - ' + message);
    
    // If regular info message it can be tokenized with ;
    // else it's a response to our message and should not be split
    if (message.indexOf(";") > -1)  {
        var message_arr = message.split(";");
        var request_type = message_arr[0].substring(0, message_arr[0].indexOf(":"));
    }
    else {
        var request_type = message.substring(0, message.indexOf(' '));
    }
        
    
    // what kind of request
    switch(request_type) {
        case "req":
            var answer = "reg:" + parseParameterValue(message_arr[0]) + ";status:0\n";
            var last_gsm_status = parseParameterValue(message_arr[5]);
            var last_voip_status = parseParameterValue(message_arr[6]);
            var last_voip_state = parseParameterValue(message_arr[7]);
            var last_signal_strength = parseParameterValue(message_arr[4]);
            var imei = parseParameterValue(message_arr[9]);
            var authentication = parseParameterValue(message_arr[1]);

            // send ACK
            sendMessage(answer, remote.address, remote.port)
            
            // insert all parameters into database tables and log
            models.channelEvent.write(authentication, imei, last_gsm_status, last_voip_status, last_voip_state, last_signal_strength, remote.address, remote.port);

            break;

        case "CELLINFO":
            var answer = "CELLINFO " +  parseParameterValue(message_arr[0]) + " OK\n";
            var id = parseParameterValue(message_arr[1]);
            var info = parseParameterValue(message_arr[3]);
            sendMessage(answer, remote.address, remote.port);

            // insert cell info into database
            models.cellInfoEvent.write(id, info)
            break;

        case "CGATT":
            var answer = "CGATT " +  parseParameterValue(message_arr[0]) + " OK\n";
            sendMessage(answer, remote.address, remote.port);
            break;

        case "USSD":
            // It is USSD response
            message = message.slice(5, message.length);
            var responseid = message.slice(0, message.indexOf(' '));
            var ussd_message = message.slice(responseid.length + 1, message.length);
            models.ussdEvent.write(responseid, ussd_message)
            break;

        case "PASSWORD":
            // It is SMS response from gw
            console.log('Received PASSWORD message: ' + message);
            message = message.slice(9, message.length);
            var responseid = message.slice(0, message.indexOf('  '))
            var answer = 'PASSWORD ' + responseid + ' ' + models.smsEvent.password(responseid)
            sendMessage(answer, remote.address, remote.port);
            break;

        case "SEND":
            message = message.slice(5, message.length);
            var responseid = message.slice(0, message.length - 1);
            var answer = 'SEND ' + responseid + ' ' + models.smsEvent.send(responseid)
            sendMessage(answer, remote.address, remote.port);
            break;
        break;

        case "WAIT":
            log('Received WAIT message: ' + message);
            message = message.slice(5, message.length);
            var responseid = message.slice(0, message.indexOf(' '));
            var telid = message.slice(responseid.length + 1, message.length);
            models.smsEvent.wait(responseid, telid)
            break

        case "OK":
            log('Received OK message: ' + message);
            message = message.slice(3, message.length);
            var responseid = message.slice(0, message.indexOf(' '));
            var answer = 'DONE ' + responseid + ' ' + models.smsEvent.ok(responseid)
            sendMessage(answer, remote.address, remote.port);
            break;

        case "DONE":
            log('Received DONE message: ' + message);
            message = message.slice(5, message.length);
            var responseid = message.slice(0, message.indexOf(' '));
            models.smsEvent.done(responseid)
            break;

        case "RECEIVE":
            // It is incoming SMS message
            var responseid = parseParameterValue(message_arr[0]);
            var username = parseParameterValue(message_arr[1]);
            var password = parseParameterValue(message_arr[2]);
            var srcnum = parseParameterValue(message_arr[3]);
            var message = parseParameterValue(message_arr[4]);
            var answer = 'RECEIVE ' + responseid + ' OK\n';
            sendMessage(answer, remote.address, remote.port);
            models.smsEvent.receive(username, srcnum, message)
            break;

        case "DELIVER":
            log('Received DELIVER message: ' + message);
            break;

        case "EXPIRY":
            log('EXPIRY message: ' + message);
            break;

        case "STATE":
            log('STATE message: ' + message)
            var responseid = parseParameterValue(message_arr[0])
            var username = parseParameterValue(message_arr[1])
            var password = parseParameterValue(message_arr[2])
            var gsm_state = parseParameterValue(message_arr[3])
            var answer = 'STATE ' + responseid + ' OK\n'
            sendMessage(answer, remote.address, remote.port)
            models.stateEvent.write(username, gsm_state)
            break

        case "RECORD":
            log('RECORD message: ' + message);
            var responseid = parseParameterValue(message_arr[0]);
            var username = parseParameterValue(message_arr[1]);
            var password = parseParameterValue(message_arr[2]);
            var direction = parseParameterValue(message_arr[3])
            var callnum = parseParameterValue(message_arr[4]);
            var answer = 'RECORD ' + responseid + ' OK\n';
            sendMessage(answer, remote.address, remote.port);
            break

        case "ERROR":
            log('ERROR message: ' + message);
            message = message.slice(6, message.length);
            var responseid = message.slice(0, message.indexOf(' '));
            var telid = message.slice(responseid.length + 1, message.indexOf(' error'));
            var errorstatus = message.slice(message.indexOf(':') + 1).trim();
            models.smsEvent.error(responseud, errorstatus)
            break
            
        default:
            console.log("Unkonwn message:" + message);
    }
});

/*
 * Server error function
 */
server.on('error', function() {
    console.log('UDP server returned error, closing()');
    server.close();
    return;
});

// public
var self  = module.exports = {
    start : function() {
        server.bind(PORT, HOST)
    }
}
