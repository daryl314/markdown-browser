#!/usr/bin/env node
// run from repl with '.load node-render.js'
// debug with 'node debug node-render.js'

// check input arguments
if (process.argv.length < 3) {
  console.log("Usage:")
  console.log("  node node-render.js <file>.md");
  console.log("  node node-render.js <syncData location>");
  process.exit(1);
}

// require node modules
global.vm = require('vm');
global.fs = require('fs');
global.path = require('path');
global.cheerio = require('cheerio');

// load dependencies
vm.runInThisContext(fs.readFileSync('markdown.js'));
vm.runInThisContext(fs.readFileSync('evernote.js'));

// give info on promise rejections
process.on('unhandledRejection', r => console.log(r));

// function to convert a markdown string to html
function render(data) {
    
    // convert markdown to html
    var h = markdown.toHTML(
        data.toString().replace(/\[TOC\]/gi, '<toc></toc>') // TOC jQuery can find
        ,{
            includeLines:false
        }
    );

    // wrap html in cheerio
    var $ = cheerio.load(h);

    // filter out headers
    var $h = $(':header').not('h1');

    // identify lowest-level header
    var minHeader = Math.min.apply(null,
        $h.map(function(){
        return parseInt($(this).prop('tagName').slice(1))
        })
    );

    // generate a markdown table of contents
    var mdTOC = $h.map(function(){
        var level = parseInt($(this).prop("tagName").slice(1));
        var spaces = Array(1+2*(level-minHeader)).join(' ');
        return spaces + "* ["+$(this).html()+"](#"+$(this).attr('id')+")";
    }).toArray().join('\n');

    // create an html table of contents
    var toc = markdown.toHTML(mdTOC);

    // fill TOC elements
    $('toc').html(toc.replace(/ul>/g, 'ol>'));

    // add CSS
    $('head').append(`
        <style type='text/css'>
            a       {color:aqua;    font-weight:bold; }
            h1      {color:red;     font-weight:bold; }
            h2      {color:yellow;  font-weight:bold; }
            h3      {color:yellow;                    }
            strong  {color:white;   font-weight:bold; }
            code    {color:lime;    font-weight:bold; }
            pre     {color:lime;    font-weight:bold; }
            th      {color:white;   font-weight:bold; }
            em      {text-decoration:underline;       }
        </style>
    `)

    // return html
    return $.html()
}

// help text on using elinks
const elinks = `## Using elinks ##

* \`j\` - scroll down
* \`k\` - scroll up
* \`Ctrl-F\` - scroll forward one screen
* \`Ctrl-B\` - scroll backward one screen
* \`Ctrl-D\` - scroll down a half screen
* \`Ctrl-U\` - scroll up a half screen
* \`Left\` - go to previous page
* \`Down\` - go to next link
* \`Enter\` or \`Right\` - follow link
`;

// function to process synchronization data and generate html
function syncToHtml(syncLoc) {

    // create output folder if it doesn't exist
    if (!(fs.existsSync(`${syncLoc}/html`))) {
        fs.mkdirSync(`${syncLoc}/html`)
    }

    // create connection to sync data
    var conn = new WrappedNoteCollectionSyncData(syncLoc, ioHandler=NodeIO);
    conn.connect().then(() => {

        // notify user of notes that were skipped
        conn.notes.forEach(x => {
            if (!(conn.versionData[x.guid])) {
                console.log(`Skipping non-existent note "${x.title}" [${x.guid}]`);
            }
        });

        // filter notes to those that exist, have 'markdown' tag, and have not been deleted
        var mdNotes = conn.notes.filter(x => 
            x.deleted === null 
                && x.tags.includes('markdown')
                && conn.versionData[x.guid]
        );

        // notes grouped by notebook
        var notesByNotebook = {};
        mdNotes.forEach(n => {
            notesByNotebook[n.notebook] = notesByNotebook[n.notebook] || [];
            notesByNotebook[n.notebook].push(n)
        });

        // generate a promise to generate a web page for each filtered note
        var p = mdNotes.map(n => n.getContent().then(c => {
            var html = render(EvernoteConnectionBase.stripFormatting(c.html()));
            var loc = `${syncLoc}/html/${n.notebook}`;
            if (!fs.existsSync(loc)) {
                fs.mkdirSync(loc);
            }
            fs.writeFileSync(`${loc}/${n.title}.html`, html);
        }));

        // execute promises
        p = Promise.all(p);

        // generate an index page for each notebook
        p.then(() => {
            Object.keys(notesByNotebook).forEach(nb => {
                var li = notesByNotebook[nb].map(n => `* [${n.title}](${n.title}.html)`);
                li = li.sort((a,b) => a.toLowerCase() > b.toLowerCase());
                var md = elinks+'\n## Page Index ##\n\n'+li.join('\n');
                fs.writeFileSync(`${syncLoc}/html/${nb}/index.html`, render(md));
            });
        });

        // generate a cross-notebook index
        var li = Object.keys(notesByNotebook).map(nb => `* [${nb}](${nb}/index.html)`)
        li = li.sort((a,b) => a.toLowerCase() > b.toLowerCase());
        var md = elinks+'\n## Page Index ##\n\n'+li.join('\n');
        fs.writeFileSync(`${syncLoc}/html/index.html`, render(md));

    });
}

// handle input
if (process.argv[2].endsWith('.md')) {
    console.log(render(fs.readFileSync(process.argv[2])));
} else {
    syncToHtml(process.argv[2])
}