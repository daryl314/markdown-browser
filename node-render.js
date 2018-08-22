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
function render(data, depth=1) {
    
    // convert markdown to html
    var h = markdown.toHTML(
        data.toString().replace(/\[TOC\]/gi, '<toc></toc>') // TOC jQuery can find
        ,{
            includeLines:false,
            wrapInHtml:true
        }
    );

    ///// START CHEERIO PROCESSING /////

    // wrap html in cheerio
    var $ = cheerio.load(h, {xmlMode: true});

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

    // extract html
    var body = $('body').html();
    var head = $('head').html();

    ///// END CHEERIO PROCESSING /////

    // add CSS
    head += `
        <link rel="stylesheet" href="${'../'.repeat(depth)}lib/bootswatch-cosmo.min.css" />
        <style type='text/css'>
            @media tty { /* CSS for terminal web browsers */
            }
            body {
                padding: 50px 0px 20px 0px;
            }
            #markdown-container {
                overflow-y: scroll;
                height: calc(100vh - 50px);
            }

            /* Navbar */

            nav.navbar {
                background-color: #2780e3;
            }

            /* Inline table of contents */

            toc {
                display: inline-block;
                margin-top:10px;
            }
            toc ol ol {
                padding-left: 20px;
            }
            toc > ol {
                border: 1px solid grey;
                padding: 10px;
                background-color: #eeeeee;
            }
            toc a {
                padding-left: 5px;
                color: black;
            }
            toc ol {
                counter-reset: item;
            }
            toc li {
                display: block;
                /*border-top: 1px dashed gray;*/
            }
            toc li:before {
                content: counters(item, ".") " ";
                counter-increment: item
            }

            /* Floating/Navigation table of contents */

            .toc-menu, .toc-menu ul {
                list-style-type:none;
            }
            .toc-menu a {
                color: black;
                display: block;
                text-decoration: none;
            }
            .toc-menu a:hover,
            .toc-menu li.active > a
            {
                color: white;
                background-color: #2780e3;
            }
            .toc-menu li ul {
                display:none;
            }
            .toc-menu li:hover ul,
            .toc-menu li.visible ul
            {
                display:block;
            }
            .toc-menu, .toc-menu ul, .toc-menu li {
                padding: 0px;
            }
            .toc-menu > li > a {
                padding-left:20px;
            }
            .toc-menu > li > ul > li > a {
                padding-left:40px;
            }
            .toc-menu > li > ul > li > ul > li > a {
                padding-left:60px;
            }
            .toc-menu a {
                border-top: 1px solid #eeeeee;
            }
            .toc-menu {
                margin-top:20px;
                border-left: 1px solid #eeeeee;
                border-right: 1px solid #eeeeee;
                border-bottom: 1px solid #eeeeee;
            }

            /* Map mode TOC */

            #markdown-toc {
                padding-left     : 10px;
                padding-right    : 10px;
                padding-bottom   : 0px;
                padding-top      : 10px;
                height           : calc(100vh - 50px);
                background-color : #d7d8d8;
            }
            #markdown-toc, #markdown-toc a {
                color: #1d1e1f;
            }
            #markdown-toc .tree-toggle {
                float:left;
                width:1em;
            }
            #markdown-toc ul {
                list-style-type: none;
            }
            #markdown-toc > ul {
                font-size: 0.8em;
            }
            #markdown-toc ul {
                padding-left : 1.3em;
                text-indent  : -1.0em;
            }
            #markdown-toc div.tree-toggle {
                cursor : pointer;
            }
            #markdown-toc li.visible > div.tree-toggle {
                color: red;
            }
            #markdown-toc li.active > a {
                font-weight: bold;
            }

            /* Slideout CSS */

            body {
                width: 100%;
                height: 100%;
            }

            .slideout-menu {
                position: fixed;
                top: 0;
                bottom: 0;
                width: 700px;
                min-height: 100vh;
                overflow-y: scroll;
                -webkit-overflow-scrolling: touch;
                z-index: 0;
                display: none;
            }

            .slideout-menu-left {
                left: 0;
            }

            .slideout-menu-right {
                right: 0;
            }

            .slideout-panel {
                position: relative;
                z-index: 1;
                will-change: transform;
                background-color: #FFF; /* A background-color is required */
                min-height: 100vh;
            }

            .slideout-open, .slideout-open body, .slideout-open .slideout-panel {
                overflow: hidden;
            }

            .slideout-open .slideout-menu {
                display: block;
            }
        </style>
    `;

    // add core post-processing libraries
    body += `
        <!-- JAVASCRIPT LIBRARIES -->
        <script type="text/javascript" src="${'../'.repeat(depth)}lib/jquery.min.js"></script>
        <script type="text/javascript" src="${'../'.repeat(depth)}lib/lodash.min.js"></script>
        <script type="text/javascript" src="${'../'.repeat(depth)}markdown.js"></script>
        <script type="text/javascript" src="${'../'.repeat(depth)}lib/slideout.min.js"></script>
        <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/js/bootstrap.min.js"></script>
    `;

    // add syntax highlighting libraries if applicable
    if ($('pre code').length > 0) {
        body += `
            <!-- SYNTAX HIGHLIGHTING -->
            <link rel="stylesheet" href="${'../'.repeat(depth)}lib/highlight-atelier-forest-light.min.css" />
            <script type="text/javascript" src="${'../'.repeat(depth)}lib/highlight.pack.js"></script>
        `
    }

    // add latex rendering libraries if applicable
    if ($('latex').length > 0) {
        body += `
            <!-- LATEX RENDERING -->
            <script src="${'../'.repeat(depth)}katex-0.5.1/katex.min.js"></script>
            <link rel="stylesheet" href="${'../'.repeat(depth)}katex-0.5.1/katex.min.css">
        `;
    }

    // add navigation bar
    body = `
    <nav class="navbar navbar-default navbar-fixed-top">
        <div class="container">
            <div class="navbar-header">
                <a class='navbar-brand' href='#'>&#9776; <span>Project name</span></a>
            </div>
            <div id="navbar" class="navbar-collapse collapse">
                <ul class="nav navbar-nav">
                    <li><a id="map-mode-toggle" href="#">Map Mode <span class="sr-only">(current)</span></a></li>
                    <li><a id="map-show-all" href="#">Show All</a></li>
                    <li><a href="index.html">Page Index</a></li>
                </ul>
            </div><!--/.nav-collapse -->
        </div>
    </nav>
    ` + body;

    // perform post-processing
    body += `
        <!-- PROCESS RENDERED MARKDOWN -->
        <script type="text/javascript" src="${'../'.repeat(depth)}process-rendered.js"></script>
    `;

    // return html
    return `<!DOCTYPE html>
    <html lang="en">
      <head>${head}</head>
      <body>${body}</body>
    </html>`;
}

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

    // subfunction to return a notebook's path
    function notebookDirectory(nb) {
        return path.join(syncLoc, 'html', sanitizeFileName(nb))
    }

    // subfunction to return a note's file name
    function noteFileName(n) {
        return path.join(notebookDirectory(n.notebook), `${sanitizeFileName(n.title)}.html`)
    }

    // subfunction to recursively remove a directory
    function rmrf(path) {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach(function(file, index){
                var curPath = path + "/" + file;
                if (fs.lstatSync(curPath).isDirectory()) { // recurse
                    rmrf(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    }

    // clear output folder if it exists; create otherwise
    if (fs.existsSync(`${syncLoc}/html`)) {
        rmrf(`${syncLoc}/html`);
    }
    fs.mkdirSync(`${syncLoc}/html`);

    // create resource folder if it doesn't exist
    if (!(fs.existsSync(`${syncLoc}/html/lib`))) {
        fs.mkdirSync(`${syncLoc}/html/lib`)
    }

    // copy resources
    function copyResource(name) {
        let src = `${__dirname}/${name}`;
        let tgt =`${syncLoc}/html/${name}`;
        console.log(`linking ${src} -> ${tgt}`); 
        fs.symlinkSync(src, tgt);
    }
    let resources = [
        'lib/bootswatch-cosmo.min.css',
        'lib/bootstrap-dropdown-3.3.4.js',
        'lib/jquery.min.js',
        'lib/lodash.min.js',
        'lib/highlight-atelier-forest-light.min.css',
        'lib/highlight.pack.js',
        'lib/slideout.min.js',
        'markdown.js',
        'katex-0.5.1',
        'process-rendered.js',
        'script'
    ];
    resources.forEach(copyResource);

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
            var noteData = EvernoteConnectionBase.stripFormatting(c.html());
            var html = render(noteData);
            var outFile = noteFileName(n);
            if (!fs.existsSync(path.dirname(outFile))) {
                fs.mkdirSync(path.dirname(outFile));
            }
            fs.writeFileSync(outFile, html);
            fs.writeFileSync(outFile.replace(/\.html$/,'.md'), noteData);
        }));

        // execute promises
        p = Promise.all(p);

        // case-insensitive sorting function
        function sorter(a,b) {
            a_ = a.toLowerCase();
            b_ = b.toLowerCase();
            return a_ < b_ 
                ? -1 
                : (a_ > b_ 
                    ? 1 
                    : 0)
        }

        // generate an index page for each notebook
        p.then(() => {
            Object.keys(notesByNotebook).forEach(nb => {
                notesByNotebook[nb].sort((a,b) => sorter(a.title,b.title));
                var li = notesByNotebook[nb].map(n => `* [${n.title}](${path.basename(noteFileName(n))})`);
                var md = '## Page Index ##\n\n'+li.join('\n');
                fs.writeFileSync(path.join(notebookDirectory(nb), 'index.html'), render(md));
            });
        });

        // generate a cross-notebook index
        var li = Object.keys(notesByNotebook).sort(sorter).map(nb => `* [${nb}](${path.basename(notebookDirectory(nb))}/index.html)`);
        var md = '## Page Index ##\n\n'+li.join('\n');
        fs.writeFileSync(`${syncLoc}/html/index.html`, render(md));

    });
}

// handle input
if (process.argv[2].endsWith('.md')) {
    console.log(render(fs.readFileSync(process.argv[2])));
} else {
    syncToHtml(process.argv[2])
}
