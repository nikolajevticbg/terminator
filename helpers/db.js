/**
 * helpers/db.js
 */


// Private
var mysql = require('mysql');
var pool = mysql.createPool({
    connectionLimit : 20,
    host            : '127.0.0.1',
    user            : 'voipuser',
    password        : 'voipass',
    database        : 'voip_termination'
});

// Public

var self = module.exports = {

getConnection : function(callback) {
        pool.getConnection( function(err, connection) {
            if (err) {
                connection.release();
                res.json({"code" : 100, "status" : "Error in connecting to voip_termination"});
                console.log(res)
                return null;
            }

            connection.on('error', function(err) {
                res.json({"code" : 100, "status" : "Error in connecting to voip_termination"});
                console.log(res)
                return null;   
            });
            callback(connection);
        });
    }
}

