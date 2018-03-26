const config = require('./config');
let db = {};
let mongodb = require('mongodb');
let MongoClient = require('mongodb').MongoClient;


db.connect = async () => {
    try {
        let connection = await MongoClient.connect(config.dbURL);
        db.auth = connection.collection('accounts');
        //rest of the collections go here
        db.auth.ensureIndex({ "id": 1 }, { unique: true }); //unique id field always so as to avoid multiple same accounts
        delete db.connect;
    } catch (e) {
        console.log(e);
        return;
    }
}

module.exports = db;