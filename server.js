var express = require("express");
var shortid = require("shortid");
var mongo = require("mongodb").MongoClient;
var url = process.env.MONGOLAB_URI;
var app = express();
var port = process.env.PORT || 8080;
// Url regex from: https://gist.github.com/dperini/729294
var re_weburl = new RegExp(
  "^/new/" +
    // protocol identifier
    "(?:(?:https?|ftp)://)" +
    // user:pass authentication
    "(?:\\S+(?::\\S*)?@)?" +
    "(?:" +
      // IP address exclusion
      // private & local networks
      "(?!(?:10|127)(?:\\.\\d{1,3}){3})" +
      "(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" +
      "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
      // IP address dotted notation octets
      // excludes loopback network 0.0.0.0
      // excludes reserved space >= 224.0.0.0
      // excludes network & broacast addresses
      // (first & last IP address of each class)
      "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
      "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
      "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
    "|" +
      // host name
      "(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)" +
      // domain name
      "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*" +
      // TLD identifier
      "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))" +
      // TLD may end with dot
      "\\.?" +
    ")" +
    // port number
    "(?::\\d{2,5})?" +
    // resource path
    "(?:[/?#]\\S*)?" +
  "$", "i"
);

app.set("views", __dirname + '/views');
app.set("view engine", "pug");

app.get('/', function(req,res) {
    res.render("index");
});

app.get('/:num', function(req,res) {
    var q = req.params.num;
    if(shortid.isValid(q)) {
        mongo.connect(url, function(err,db) {
            if (err) throw err;
            var collection = db.collection('shorturl');
            var objtosearch = {'id': q};
            collection.findOne(objtosearch, function(err,data) {
                if (err) throw err;
                if(data == null) {
                    res.end(JSON.stringify({ 'error': 'No website found with short-url'}))
                }
                else {
                    res.redirect(data.original_url);
                }
                db.close();
            })
        })
    }
    else {
        res.end(JSON.stringify({ 'error': 'Invalid short-url'}));
    }
});

app.get(re_weburl, function(req,res) {
    var q = req.url.substr(5);
    
    mongo.connect(url, function(err,db) {
        if (err) throw err;
        var collection = db.collection('shorturl');
        var objtosearch = {'original_url': q};
        var objtoinsert = {'original_url': q, 'id': shortid.generate()};
        collection.findOne(objtosearch, function(err,data) {
            if (err) throw err;
            if(data == null) {
                collection.insertOne(objtoinsert, function(err,newel) {
                    if (err) throw err;
                    res.end(JSON.stringify({'original_url': q, 'short_url' : process.env.APP_URL+newel.ops[0].id }));
                    db.close();
                });
            }
            else {
                res.end(JSON.stringify({'original_url': q, 'short_url' : process.env.APP_URL+data.id }));
                db.close();
            }
        });
    });
});

app.get('/new/*', function(req,res) {
    res.end(JSON.stringify({'error': 'Invalid Url'}));
});

app.listen(port);

