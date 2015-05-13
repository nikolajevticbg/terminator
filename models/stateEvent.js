/**
 * models/stateEvent.js
 */

// Private
var dbConn = require('../helpers/db.js');


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
    write : function(authentication, gsm_status) {
        qry = 'CALL UpdateGsmStatus(\'' + authentication + '\', \'' +  gsm_status + '\')'
        console.log(qry)
        executeQuery(qry)       
    }
}
