#!/usr/bin/env node
// run from repl with '.load node-sync.js'
// debug with 'node debug node-sync.js'

// check input arguments
if (process.argv.length < 4) {
  console.log("Usage:\nnode node-sync.js <token> <path>");
  process.exit(1);
}

// require node modules
global.vm = require('vm');
global.fs = require('fs');
global.path = require('path');

// load dependencies
global.Evernote = require('evernote');
vm.runInThisContext(fs.readFileSync(`${__dirname}/../js/evernote.js`));
vm.runInThisContext(fs.readFileSync(`${__dirname}/../lib/lodash.min.js`));

// instantiate synchronizer
var sync = new Synchronizer(
  process.argv[2],  // token
  "ignored",        // url
  process.argv[3],  // local folder
  {
    ioHandler: NodeIO
  }
);

// give info on promise rejections
process.on('unhandledRejection', r => console.log(r));

// execute synchronization
console.log("Starting synchronization: "+process.argv[3]);
sync.synchronize().then( () => { console.log('Synchronization complete!') });
