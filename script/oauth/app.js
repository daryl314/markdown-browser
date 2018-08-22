// imports
const express = require('express');
const Evernote = require('evernote');
const fs = require('fs');
const util = require('util');

// configuration
const config = {
  "API_CONSUMER_KEY" : "daryl314-2364",
  "API_CONSUMER_SECRET" : "45583d748cbc617e",
  "SANDBOX" : false,
  "CHINA" : false
};
const callbackUrl = "http://localhost:3000/oauth_callback";
const token_file = './token.json'

// function to return evernote client object
function getClient(token) {
  var opt = {sandbox: config.SANDBOX, china: config.CHINA};
  if (token) {
    opt.token = token;
  } else {
    opt.consumerKey    = config.API_CONSUMER_KEY;
    opt.consumerSecret = config.API_CONSUMER_SECRET;
  }
  return new Evernote.Client(opt);
}

// global state
var state = {};
if (fs.existsSync(token_file)) {
  state = JSON.parse(fs.readFileSync(token_file))
} 

// initialize express session
var app = express();

////////////
// ROUTES //
////////////

app.get('/', function(req,res){
  console.log("GET /");
  if (state.oauthAccessToken) {
    console.log(state.oauthAccessToken);
    getClient(state.oauthAccessToken).getNoteStore().listNotebooks().then(function(notebooks) {
      res.send(`
        <h2>Access Token</h2>
        <ul><li>${state.oauthAccessToken}</li></ul>
        <h2>Notebooks</h2>
        <ul>${notebooks.map(n=>'<li>'+n.name+'</li>').join('\n')}<ul>
      `);
      fs.writeFileSync(token_file, JSON.stringify(state));
    }, function(error) {
      res.send(`
        <h2>Access Token</h2>
        <ul><li>${state.oauthAccessToken}</li></ul>
        ERROR: ${util.inspect(error)}<br/>
        <a href="/oauth">Click here</a> to connect Evernote
      `)
    });
  } else {
    if (state.error) {
      res.send(`
        CALLBACK ERROR: ${state.error}<br/>
        <a href="/oauth">Click here</a> to connect Evernote
      `)
      res.send('ERROR: '+state.error);
    } else {
      res.send('<a href="/oauth">Click here</a> to connect Evernote');
    }
  }
});

app.get('/oauth', function(req,res){
  console.log("GET /oauth");
  var client = getClient();
  client.getRequestToken(callbackUrl, function(error, oauthToken, oauthTokenSecret, results) {
    if (error) {
      console.log("  - ERROR: " + JSON.stringify(error));
      state.error = JSON.stringify(error);
      res.redirect('/');
    } else {
      console.log("  - oauthToken: " + oauthToken);
      console.log("  - oauthTokenSecret: " + oauthTokenSecret);
      console.log(results);
      state.oauthToken = oauthToken;
      state.oauthTokenSecret = oauthTokenSecret;
      res.redirect(client.getAuthorizeUrl(oauthToken)); // redirect to authorize token
    }
  });
});

app.get('/oauth_callback', function(req,res){
  console.log("GET /oauth_callback");
  getClient().getAccessToken(
    state.oauthToken, 
    state.oauthTokenSecret, 
    req.query.oauth_verifier,
    function(error, oauthAccessToken, oauthAccessTokenSecret, results) {
      if (error) {
        console.log('error');
        console.log(error);
        res.redirect('/');
      } else {
        console.log("  - oauthAccessToken: " + oauthAccessToken);
        console.log("  - oauthAccessTokenSecret: " + oauthAccessTokenSecret);
        console.log(results);
        state.oauthAccessToken = oauthAccessToken;
        state.oauthAccessTokenSecret = oauthAccessTokenSecret;
        state.results = results;
        res.redirect('/');
      }
  });
});

// start express
app.listen(3000 , function() {
  console.log('Express server listening on port 3000');
});
