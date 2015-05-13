/**
 * models/channelEvent.js
 */

// Private
var dbConn = require('../helpers/db.js')
var chanSpool = require('./checkChannelSpool.js')


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
    write : function(authentication, 
                          imei, 
                          last_gsm_status,
                          last_voip_status, 
                          last_voip_state, 
                          last_signal_strength, 
                          remote_address, 
                          remote_port) {

        qry = 'CALL InsertChannelEvent(\'' + authentication + '\', \'' + imei + '\', \'' + last_gsm_status  + '\', \'' + last_voip_status + '\', \'' + last_voip_state + '\', ' + last_signal_strength + ', \'' + remote_address + '\', ' + remote_port + ')'
        console.log(qry)
        executeQuery(qry)

        // check if any request for action on channel in the queue
        chanSpool.read(authentication, function(result) {
            // option to show result from chanSpool read    
        })
    }
}
