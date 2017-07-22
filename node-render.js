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
global.fse = require('fs-extra');
global.path = require('path');
global.cheerio = require('cheerio');

// load dependencies
vm.runInThisContext(fs.readFileSync('markdown.js'));
vm.runInThisContext(fs.readFileSync('evernote.js'));

// give info on promise rejections
process.on('unhandledRejection', r => console.log(r));

// function to convert a markdown string to html
function render(data, depth=1) {
    
    // convert markdown to html
    var h = markdown.toHTML(
        data.toString().replace(/\[TOC\]/gi, '<toc></toc>') // TOC jQuery can find
        ,{
            includeLines:false,
            wrapInHtml:true
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
    var toc = `
        <p><strong>Contents</strong></p>
        ${markdown.toHTML(mdTOC)}
        <hr/>
    `;

    // fill TOC elements
    $('toc').html(toc.replace(/ul>/g, 'ol>'));

    // add CSS
    $('head').append(`
        <link rel="stylesheet" href="${'../'.repeat(depth)}lib/bootswatch-cosmo.min.css" />
        <style type='text/css'>
            @media tty { /* CSS for terminal web browsers */
                h1      {color:red;     font-weight:bold; text-align:left; }
                h2      {color:yellow;  font-weight:bold; text-align:left; }
                h3      {color:yellow;                    text-align:left; }
                a       {color:aqua;    font-weight:bold; }
                strong  {color:white;   font-weight:bold; }
                code    {color:lime;    font-weight:bold; }
                pre     {color:lime;    font-weight:bold; }
                th      {color:white;   font-weight:bold; }
                em      {text-decoration:underline;       }
            }
            body {
                padding: 5px 20px;
            }
            #markdown-container {
                overflow-y: scroll;
                height: 100vh;
            }
            #markdown-toc li.active > a {
                color: white;
                background-color: #2780e3;
            }
        </style>
    `);

    // add core post-processing libraries
    $('body').append(`
        <!-- JAVASCRIPT LIBRARIES -->
        <script type="text/javascript" src="${'../'.repeat(depth)}lib/jquery.min.js"></script>
        <script type="text/javascript" src="${'../'.repeat(depth)}lib/lodash.min.js"></script>
        <script type="text/javascript" src="${'../'.repeat(depth)}markdown.js"></script>
    `);

    // add syntax highlighting libraries if applicable
    if ($('pre code').length > 0) {
        $('body').append(`
            <!-- SYNTAX HIGHLIGHTING -->
            <link rel="stylesheet" href="${'../'.repeat(depth)}lib/highlight-atelier-forest-light.min.css" />
            <script type="text/javascript" src="${'../'.repeat(depth)}lib/highlight-9.8.0.min.js"></script>
        `)
    }

    // add latex rendering libraries if applicable
    if ($('latex').length > 0) {
        $('body').append(`
            <!-- LATEX RENDERING -->
            <script src="${'../'.repeat(depth)}katex-0.5.1/katex.min.js"></script>
            <link rel="stylesheet" href="${'../'.repeat(depth)}katex-0.5.1/katex.min.css">
        `)
    }

    // perform post-processing
    $('body').append(`
        <!-- PROCESS RENDERED MARKDOWN -->
        <script type="text/javascript">
            jQuery(function(){ // wait for document to be ready
                var renderer = new MarkdownRenderer();
                var data = renderer.processRenderedMarkdown($('body'));
                $('#markdown-container').addClass("col-md-10").wrap('<div id="container" class="container-fluid"></div>');
                $('#container').append('<div id="markdown-toc" class="col-md-2 hidden-print">');
                $('#markdown-toc').html(data.toc);
                $('#markdown-toc > ul').addClass('col-md-2 affix');
                $('#markdown-toc a').add('toc a').each(function(){ 
                    $(this).attr('href', $(this).data('href')) 
                });

                var scrollSync = new ScrollSync(null, $('#markdown-container'), $('#markdown-toc'));

                /*
                var headingLookup = [];
                $(':header').each( function(){
                    var matchingToc = $('#markdown-toc').find("a[data-href='#" + $(this).attr('id') + "']");
                    if (matchingToc.length > 0) {
                        headingLookup.push([
                        $(this).position().top + $('#markdown-container').scrollTop(),
                        matchingToc
                        ])
                    }
                });
                */
            })
        </script>
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
* \`Enter\`, \`Right\`, or click - follow link
* \`Escape\` - show menu
`;

// function to process synchronization data and generate html
function syncToHtml(syncLoc) {

    // subfunction to sanitize file names
    function sanitizeFileName(x) {
        return x.replace(/\//g, '%2f')
    }

    // subfunction to sanitize URL's
    function sanitizeFileURL(x) {
        return encodeURIComponent(sanitizeFileName(x)).replace(/\(/g, '%28').replace(/\)/g, '%29');
    }

    // create output folder if it doesn't exist
    if (!(fs.existsSync(`${syncLoc}/html`))) {
        fs.mkdirSync(`${syncLoc}/html`)
    }

    // create resource folder if it doesn't exist
    if (!(fs.existsSync(`${syncLoc}/html/lib`))) {
        fs.mkdirSync(`${syncLoc}/html/lib`)
    }

    // copy resources
    function copyResource(name) {
        fse.copySync(`${__dirname}/${name}`, `${syncLoc}/html/${name}`);
    }
    copyResource('lib/bootswatch-cosmo.min.css');
    copyResource('lib/jquery.min.js');
    copyResource('lib/lodash.min.js');
    copyResource('lib/highlight-atelier-forest-light.min.css');
    copyResource('lib/highlight-9.8.0.min.js');
    copyResource('markdown.js');
    copyResource('katex-0.5.1');

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
            var loc = `${syncLoc}/html/${sanitizeFileName(n.notebook)}`;
            if (!fs.existsSync(loc)) {
                fs.mkdirSync(loc);
            }
            fs.writeFileSync(`${loc}/${sanitizeFileName(n.title)}.html`, html);
        }));

        // execute promises
        p = Promise.all(p);

        // generate an index page for each notebook
        p.then(() => {
            Object.keys(notesByNotebook).forEach(nb => {
                var li = notesByNotebook[nb].map(n => `* [${n.title}](${sanitizeFileURL(n.title, true)}.html)`);
                li = li.sort((a,b) => a.toLowerCase() > b.toLowerCase());
                var md = elinks+'\n## Page Index ##\n\n'+li.join('\n');
                fs.writeFileSync(`${syncLoc}/html/${sanitizeFileName(nb)}/index.html`, render(md));
            });
        });

        // generate a cross-notebook index
        var li = Object.keys(notesByNotebook).map(nb => `* [${nb}](${sanitizeFileURL(nb, true)}/index.html)`)
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
