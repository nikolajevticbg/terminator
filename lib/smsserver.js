/**
 * lib/smsserver.js
 */

/*var mysql = require('mysql');
var pool = mysql.createPool({
            host : "localhost",
            user : "root",
            password : "St0ndja"
        });

*/
const PORT = 44444;
const HOST = '10.0.0.1';

var inspect = require('util').inspect;
var db = require('./db').dbclient();
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
var sendidcount = 1;
var sendSMSJson = [];

/*
 * Server send message function
 */
function sendMessage(msg) {
}

/*
 * Parse parameter value
 */
function parseParameterValue(param){
    return param.substring(param.indexOf(":")+1, param.length);
}

/*
 * Db query and return rows
 */
function query(qry, callback){
    db.query(qry)
        .on('result', function(res) {
            res.on('row', function(row) {
                callback(row);
            })
            .on('error', function(err) {
                console.log('Result error: ' + err);
            })
            .on('end', function(info) {
            });
        })
        .on('end', function() {
        });
}

/*
 * Send message parse
 */
function sendMessageParse(result, callback) {
    switch (result.type)
    {
        case 'U': //USSD
            var message = 'USSD ' + result.id + ' ' + result.password + ' ' + result.text;
            console.log('Sending message: ' + message);
            callback(message, result.local_port, result.local_ip);
        break;

        case 'S': //SMS
            var message = 'MSG ' + result.id + ' ' + result.text.length + ' ' + result.text;
            console.log('Initiate SMS session with message: ' + message);
            sendSMSJson.push({ 
                    "id" : result.id,
                    "state" : 1,
                    "message" : result.text,
                    "recipient" : result.recipient,
                    "telid" : 0,
                    "password" : result.password 
            });
            callback(message, result.local_port, result.local_ip);
        break;
    }
}


/*
 * Server listening function
 */
server.on('listening', function () {
    var address = server.address();
    console.log('UDP Server listening on ' + address.address + ":" + address.port);
});


/*
 * Server receive function
 */
server.on('message', function (message, remote) {
    message = message.toString();
    console.log(remote.address + ':' + remote.port +' - ' + message);
    
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
            server.send(answer, 0, answer.length, remote.port, remote.address);
            console.log("Answer: " + answer);
            
            // insert all parameters into database tables and log
            console.log('CALL InsertChannelEvent(\'' + authentication + '\', \'' + imei + '\', \'' + last_gsm_status  + '\', \'' + last_voip_status + '\', \'' + last_voip_state + '\', ' + last_signal_strength + ', \'' + remote.address + '\', ' + remote.port + ')');
            query('CALL InsertChannelEvent(\'' + authentication + '\', \'' + imei + '\', \'' + last_gsm_status  + '\', \'' + last_voip_status + '\', \'' + last_voip_state + '\', ' + last_signal_strength + ', \'' + remote.address + '\', ' + remote.port + ')', function(results) {
                console.log('Result: ' + inspect(results));
            });

            // check if any request for action on channel in th queue
            console.log('CALL getChannelSpool(\'' + authentication + '\')');
            query('CALL getChannelSpool(\'' + authentication + '\')' , function(results) {
                sendMessageParse(results, function(message, port, ip) {
                    server.send(message, 0, message.length, port, ip);
                });  
            });

            break;
        case "CELLINFO":
            var answer = "CELLINFO " +  parseParameterValue(message_arr[0]) + " OK\n";
            var id = parseParameterValue(message_arr[1]);
            var info = parseParameterValue(message_arr[3]);
            server.send(answer, 0, answer.length, remote.port, remote.address);
            console.log("Answer: " + answer);

            // insert cell info into database
            console.log('CALL InsertCellInfoEvent(\'' + id + '\',\'' + info + '\')')
            query('CALL InsertCellInfoEvent(\'' + id + '\',\'' + info + '\')', function(results) {
                    console.log('InsertCellInfo result: ' + inspect(results));
            });
            break;
        case "CGATT":
            var answer = "CGATT " +  parseParameterValue(message_arr[0]) + " OK\n";
            server.send(answer, 0, answer.length, remote.port, remote.address);
            console.log("Answer: " + answer);
            break;

        case "USSD":
            // It is USSD response
            message = message.slice(5, message.length);
            var responseid = message.slice(0, message.indexOf(' '));
            var ussd_message = message.slice(responseid.length + 1, message.length);
            console.log("USSD message: " + ussd_message + '\nResponse id: ' + responseid);
            query('CALL setUssdResponse(' + responseid + ', \'' +  ussd_message + '\')', function(results) {
                    console.log('setUssdResponse result: ' + inspect(results));
            });
            break;
        case "PASSWORD":
            // It is SMS response from gw
            console.log('Received PASSWORD message: ' + message);
            message = message.slice(9, message.length);
            var responseid = message.slice(0, message.indexOf('  '));
            for (var i = 0; i < sendSMSJson.length; i++) {
                if (responseid == sendSMSJson[i].id) {
                    var answer = 'PASSWORD ' + responseid + ' ' + sendSMSJson[i].password;
                    console.log('Answer to PASSWORD message: ' + answer);
                    sendSMSJson[i].state = 2;
                    server.send(answer, 0, answer.length, remote.port, remote.address);
                    break;
                }
            }
            break;

        case "SEND":
            console.log('Received SEND message: ' + message);
            message = message.slice(5, message.length);
            var responseid = message.slice(0, message.length - 1);
            for (var i = 0; i < sendSMSJson.length; i++) {
                if (responseid == sendSMSJson[i].id) {
                    sendSMSJson[i].telid = Math.floor(Math.random()*(9999-1000+1)+1000);
                    var answer = 'SEND ' + responseid + ' ' + sendSMSJson[i].telid + ' ' + sendSMSJson[i].recipient;
                    console.log('Answer to SEND message: ' + answer);
                    sendSMSJson[i].state = 3;
                    server.send(answer, 0, answer.length, remote.port, remote.address);
                    break;
                }
            }
            break;

        case "WAIT":
            console.log('Received WAIT message: ' + message);
            message = message.slice(5, message.length);
            var responseid = message.slice(0, message.indexOf(' '));
            var telid = message.slice(responseid.length + 1, message.length);
            for (var i = 0; i < sendSMSJson.length; i++) {
                if (responseid == sendSMSJson[i].id) {
                    if (sendSMSJson[i].telid = telid) {
                        console.log('CALL InsertMessageEvent(' + responseid + ', ' + sendSMSJson[i].state + ', null)');
                        query('CALL InsertMessageEvent(' + responseid + ', ' + sendSMSJson[i].state + ', null)', function(results) {
                            console.log('InsertMessageEvent result: ' + inspect(results));
                        });   
                    }
                    else {  
                        console.log('Telid not OK');
                    }
                    break;
                }
            }
            break;   

        case "OK":
            console.log('Received OK message: ' + message);
            message = message.slice(3, message.length);
            var responseid = message.slice(0, message.indexOf(' '));
            for (var i = 0; i < sendSMSJson.length; i++) {
                if (responseid == sendSMSJson[i].id) {
                    var answer = 'DONE ' + responseid + ' ' + sendSMSJson[i].telid + ' ' + sendSMSJson[i].recipient;
                    console.log('Answer to OK message: ' + answer);
                    sendSMSJson[i].state = 4;
                    server.send(answer, 0, answer.length, remote.port, remote.address);
                    console.log('CALL InsertMessageEvent(' + responseid + ', ' + sendSMSJson[i].state + ',null)');
                    query('CALL InsertMessageEvent(' + responseid + ', ' + sendSMSJson[i].state + ', null)', function(results) {
                        console.log('InsertMessageEvent result: ' + inspect(results));
                    });
                    break;
                }
            }
            break;

        case "DONE":
            console.log('Received DONE message: ' + message);
            message = message.slice(5, message.length);
            var responseid = message.slice(0, message.indexOf(' '));
            try {
                for (var i = 0; i < sendSMSSJson.length; i++) {
                    if (responseid == sendSMSJson[i].id) {
                        delete sendSMSJson[i];
                    }
                }
            }
            catch(ex) {
                console.log(ex);
            }
            break;

        case "RECEIVE":
            // It is incoming SMS message
            var responseid = parseParameterValue(message_arr[0]);
            var username = parseParameterValue(message_arr[1]);
            var password = parseParameterValue(message_arr[2]);
            var srcnum = parseParameterValue(message_arr[3]);
            var message = parseParameterValue(message_arr[4]);
            var answer = 'RECEIVE ' + responseid + ' OK\n';
            server.send(answer, 0, answer.length, remote.port, remote.address);

            query('CALL receiveMessage(' + username + ', \'' +  srcnum + '\', \'' + message + '\')', function(results) {
                    console.log('receiveMesssage result: ' + inspect(results));
            });
            break;

        case "DELIVER":
            console.log('Received DELIVER message: ' + message);
            break;

        case "EXPIRY":
            console.log('EXPIRY message: ' + message);
            break;

        case "STATE":
            console.log('EXPIRY message: ' + message);
            break;

        case "ERROR":
            console.log('ERROR message: ' + message);
            message = message.slice(6, message.length);
            var responseid = message.slice(0, message.indexOf(' '));
            var telid = message.slice(responseid.length + 1, message.indexOf(' error'));
            var errorstatus = message.slice(message.indexOf(':') + 1).trim();
            for (var i = 0; i < sendSMSJson.length; i++) {
                if (responseid == sendSMSJson[i].id) {
                    if (sendSMSJson[i].telid = telid) {
                        console.log('CALL InsertMessageEvent(' + responseid + ', 20, ' + errorstatus + ')');
                        query('CALL InsertMessageEvent(' + responseid + ', 20, ' + errorstatus + ')', function(results) {
                            console.log('InsertMessageEvent result: ' + inspect(results));
                        });   
                    }
                    else {  
                        console.log('Telid not OK');
                    }
                    break;
                }
            }
            break;
            
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

server.bind(PORT, HOST);
