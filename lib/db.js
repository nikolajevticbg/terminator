/**
 * lib/db.js
 */

var inspect = require('util').inspect;
var Client = require('mariasql');

var dbclient;
exports.dbclient = function() {
    if (dbclient == null) {
        dbclient = new Client();

        dbclient.connect({
        host: '127.0.0.1',
        user: 'voipuser',
        password: 'voipass'
        });

        dbclient.on('connect', function() {
        console.log('Database connected');
        })
        dbclient.on('error', function(err) {
        console.log('Client error: ' + err);
        })
        dbclient.on('close', function(hadError) {
        console.log('Client closed');
        });

        dbclient.query('use voip_termination')
            .on('result', function(res) {
                res.on('row', function(row) {
                    console.log('Result row: ' + inspect(row));
                })
                .on('error', function(err) {
                    console.log('Result error: ' + inspect(err));
                })
                .on('end', function(info) {
                    console.log('Result finish successfully');
                });
            })
            .on('end', function() {
                console.log('Done with all results');
            });

    return dbclient;
}
}

