#!/usr/bin/env node
// run from repl with '.load node-sync.js'
// debug with 'node debug node-sync.js'

// check input arguments
if (process.argv.length < 4) {
  console.log("Usage:\nnode node-sync.js <token> <path>");
  process.exit(1);
}

// try a few hacks to standardize the path input
var syncFolder = process.argv[3].replace(/^\.\/+/, '').replace(/\/*$/, '');

// require node modules
global.vm = require('vm');
global.fs = require('fs');
global.path = require('path');

// load dependencies
global.Evernote = require('evernote');
vm.runInThisContext(fs.readFileSync('evernote.js'));
vm.runInThisContext(fs.readFileSync('lib/lodash.min.js'));

// instantiate synchronizer
var sync = new Synchronizer(
  process.argv[2],  // token
  "ignored",        // url
  syncFolder,       // local folder
  {
    ioHandler: NodeIO
  }
);

// give info on promise rejections
process.on('unhandledRejection', r => console.log(r));

// execute synchronization
console.log("Starting synchronization: "+process.argv[3]);
sync.synchronize().then( () => { console.log('Synchronization complete!') });
