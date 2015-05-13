/**
 * models/checkChannelSpool.js
 */

// Private
var dbConn = require('../helpers/db.js')
var smsEvent = require('./smsEvent.js')


function executeQuery(qry, callback) {
    dbConn.getConnection( function(connection) {
        connection.query(qry, function(err, rows) {
                connection.release()
                if (!err) {
                    callback(rows[0]);
                }
                else {
                    console.log('Error getChannelSpool qry')
                }
            })
    });      
}

/*
 * Send message parse
 */
function sendMessageParse(result) {
    switch (result.type)
    {
        case 'U': //USSD
            var message = 'USSD ' + result.id + ' ' + result.password + ' ' + result.text;
            return ({"message" : message, "port" : result.local_port, "ip" : result.local_ip});
        break;

        case 'S': //SMS
            var message = 'MSG ' + result.id + ' ' + result.text.length + ' ' + result.text
            console.log('Initiate SMS session with message: ' + message)
            smsEvent.init(result.id, 1, result.text, result.recipient, 0, result.password)
            return ({"message" : message, "port" : result.local_port, "ip" : result.local_ip});
        break;
    }
}

//Public
var self = module.exports = {
    read : function(authentication, callback) {
        qry = 'CALL getChannelSpool(\'' + authentication + '\')'
        console.log(qry)
        executeQuery(qry, function(result) {
            console.log ('Debug: ' + JSON.stringify(result))

            if (result.type != 0) {
                sendMessageParse(result)
                callback(result)
            }
        })
    }
}
