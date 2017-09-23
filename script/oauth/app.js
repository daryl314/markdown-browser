// Module dependencies
var express = require('express');
var expressSession = require('express-session');
var routes = require('./routes');

var app = express();

app.use(expressSession({
  secret: 'supersecretsecret',
  resave: false,
  saveUnititialized: true
}));

// Routes
app.get('/', routes.index);
app.get('/oauth', routes.oauth);
app.get('/oauth_callback', routes.oauth_callback);
app.get('/clear', routes.clear);

// Run
app.listen(3000 , function() {
  console.log('Express server listening on port 3000');
});
