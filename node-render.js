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

    // return html with CSS
    return `
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
        ${$.html()}
        `
}

// function to process synchronization data and generate html
function syncToHtml(syncLoc) {
    var conn = new WrappedNoteCollectionSyncData(syncLoc, ioHandler=NodeIO);
    conn.connect().then(() => {
        var mdTagGuid = conn.meta.tags.find(x => x.name == 'markdown').guid;
        conn.meta.notes.forEach(x => {
            if (!(conn.versionData[x.guid])) {
                console.log(`Skipping non-existent note "${x.title}" [${x.guid}]`);
            }
        })
        var mdNotes = conn.meta.notes.filter(x => 
            x.deleted === null 
                && x.tagGuids 
                && x.tagGuids.includes(mdTagGuid)
                && conn.versionData[x.guid]
        );
        Promise.all(
            mdNotes.map(n => 
                conn.getNoteContent(n.guid)
                    .then(c => {
                        var html = render(EvernoteConnectionBase.stripFormatting(c.html()));
                        fs.writeFileSync(`${syncLoc}/html/${n.title}.html`, html);
                    })
            )
        );
    });
}

// handle input
if (process.argv[2].endsWith('.md')) {
    console.log(render(fs.readFileSync(process.argv[2])));
} else {
    syncToHtml(process.argv[2])
}
