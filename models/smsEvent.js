/**
 * models/ussdEvent.js
 */

// Private
var dbConn = require('../helpers/db.js');
var sendSMSJson = [];

executeQuery = function(qry) {
    dbConn.getConnection( function(connection) {
        connection.query(qry, function(err, rows) {
                connection.release()
                if (!err) {
                    console.log(JSON.stringify(rows))
                }
            })
    });      
}


//Public
var self = module.exports = {
    write : function(id, info) {
        qry = 'CALL setUssdResponse(\'' + id + '\', \'' + info + '\')'
        console.log(qry)
        executeQuery(qry)       
    },

    password : function(responseid) {
        for (var i = 0; i < sendSMSJson.length; i++) {
            if (responseid == sendSMSJson[i].id) {
                sendSMSJson[i].state = 2
                return sendSMSJson[i].password
            }
        }
    
    },

    receive : function(username, srcnum, message) {
        qry = 'CALL receiveMessage(' + username + ', \'' +  srcnum + '\', \'' + message + '\''
        console.log(qry)
        executeQuery(qry)
    },

    init : function(id, state, message, recipient, telid, password) {
            sendSMSJson.push({ 
                    "id" : id,
                    "state" : 1,
                    "message" : message,
                    "recipient" : recipient,
                    "telid" : 0,
                    "password" : password 
            })
    },

    send : function(responseid) {
        for (var i = 0; i < sendSMSJson.length; i++) {
            if (responseid == sendSMSJson[i].id) {
                sendSMSJson[i].telid = Math.floor(Math.random()*(9999-1000+1)+1000)
                sendSMSJson[i].state = 3
                return sendSMSJson[i].telid + ' ' + sendSMSJson[i].recipient
            }
        }  
    },

    wait : function(responseid, telid) {
        for (var i = 0; i < sendSMSJson.length; i++) {
            if (telid == sendSMSJson[i].telid) {
                qry = 'CALL InsertMessageEvent(' + responseid + ', ' + sendSMSJson[i].state + ', null)'
                console.log(qry)
                executeQuery(qry)
            }
        }  
    },

    ok : function(responseid) {
        for (var i = 0; i < sendSMSJson.length; i++) {
            if (responseid == sendSMSJson[i].id) {
                sendSMSJson[i].state = 4;
                qry = 'CALL InsertMessageEvent(' + responseid + ', ' + sendSMSJson[i].state + ',null)'
                console.log(qry)
                executeQuery(qry)
                return sendSMSJson[i].telid + ' ' + sendSMSJson[i].recipient
            }
        }
    },

    done : function(responseid) {
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
    },

    error : function(responseid, errorstatus) {
            for (var i = 0; i < sendSMSJson.length; i++) {
                if (responseid == sendSMSJson[i].id) {
                    if (sendSMSJson[i].telid = telid) {
                        qry = 'CALL InsertMessageEvent(' + responseid + ', 20, ' + errorstatus + ')'
                        console.log(qry)
                        executeQuery(qry)
                        return
                    }
                }
            }
    }

}
