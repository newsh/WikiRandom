var connURL = "mongodb://username:password.mlab.com:database"; //Your connection goes here
var MongoClient = require('mongodb').MongoClient;

var db_singleton = null;

var getConnection= function getConnection(callback)
{
    if (db_singleton)
    {
        callback(null,db_singleton);
    }
    else
    {
           
        
        MongoClient.connect(connURL,function(err,db){

            if(err)
                log("Error creating new connection "+err);
            else
            {
                db_singleton=db;
            }
            callback(err,db_singleton);
            return;
        });
    }
}

module.exports = getConnection;
