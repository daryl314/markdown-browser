// module object
(typeof window !== 'undefined' ? window : global).markdown = (typeof window !== 'undefined' ? window : global).markdown || {};


///////////////////
// PROCESS INPUT //
///////////////////

// function to convert markdown to HTML
markdown.toHTML = function(src, opt) {

  // process options
  opt = opt || {};
  opt.includeLines = opt.includeLines || false;
  opt.wrapInHtml   = opt.wrapInHtml   || false;

  // preprocess source string
  src = src
    .replace(/\r\n|\r/g, '\n')  // use consistent newline format
    .replace(/\t/g, '    ')     // replace tabs with spaces
    .replace(/\u00a0/g, ' ')    // replace non-breaking space with space
    .replace(/\u2424/g, '\n')   // replace unicode newline with newline
    .replace(/^ +$/gm, '');     // replace blank lines with ''

  // convert markdown to html
  let html = md_to_html_str(src)

  // wrap output in html
  if (opt.wrapInHtml) {
    html = `<!DOCTYPE html>
    <html lang="en">
      <head></head>
      <body>
        <div id="markdown-container">${html}</div>
      </body>
    </html>`;
  }

  // return result
  return html
}


//////////////////////////////
// MARKDOWN RENDERING CLASS //
//////////////////////////////

class MarkdownRenderer {

  // constructor
  constructor(opt={}) {

    // process options
    opt = opt || {};
    opt.includeLines = opt.includeLines || false;
    this.opt = opt;

    // initialize cache for processed latex
    this.latexCache = {};
  }

  // function to render markdown into the specified element
  renderMarkdown(x, $el) {

    // convert markdown to HTML
    var html = markdown.toHTML(
      x.replace(/\[TOC\]/gi, '<toc></toc>') // TOC jQuery can find
      ,{includeLines:this.opt.includeLines}
    );

    // populate specified element with text converted to markdown
    $el.html(html);

    // perform post-processing
    return this.processRenderedMarkdown($el)

  }

  // post-process rendered markdown
  processRenderedMarkdown($el) {
    var _this = this;

    // process <latex> tags
    if (typeof katex !== 'undefined') {
      $('latex').each(function(){
        let latex = _this.latexToHTML( $(this).text() );
        $(this).html(latex);
      })        
    }

    // give each header a unique ID
    $el.find(':header').each((idx, val) => { $(val).attr('id', idx) });

    // create a table of contents
    var toc = markdown.toHTML(this.extractTOC($el))
        .replace(/href/g, 'href="#" data-href')  // anchors to data-href attributes
        .replace(/<ul/g, '<ol');                 // switch to ordered lists

    // fill TOC elements
    $el.find('toc').html(toc);

    // remove line number tags from TOC entries
    $el.find('toc [data-sourcepos]').each(function(){
      $(this).attr('data-sourcepos', null)
    });

    // style tables
    $el.find('table').addClass('table table-striped table-hover table-condensed');
    $el.find('thead').addClass('btn-primary');

    // perform syntax highlighting
    if (typeof hljs !== 'undefined') {
      $el.find('pre code').each(function(i, block) {
        try {
          hljs.highlightBlock(block); 
        } catch (error) {
          console.log('Caught highlight.js exception', error);
        }
      });
    }

    // create bootstrap alert boxes
    $el.find('p').filter( function(){ return $(this).html().match(/^NOTE:/i   ) } ).addClass('alert alert-info'   )
    $el.find('p').filter( function(){ return $(this).html().match(/^WARNING:/i) } ).addClass('alert alert-warning')

    // open hyperlinks in a new tab
    $el.find('a').filter(function(){ return $(this).attr('href') && $(this).attr('href')[0] != '#' }).attr({target: '_blank'});

    // return data to caller
    return {
      toc: toc
    };    
  }

  // function to extract header data and generate a markdown table of contents list
  extractTOC($el) {

    // identify lowest-level header
    var minHeader = Math.min.apply(null,
      $el.find(':header').not('h1').map(function(){
        return parseInt($(this).prop('tagName').slice(1))
      })
    );

    // generate markdown
    return $el.find(':header').not('h1').map(function(){
      var level = parseInt($(this).prop("tagName").slice(1));
      var spaces = Array(1+2*(level-minHeader)).join(' ');
      return `${spaces}* [${$(this).text()}](#${$(this).attr('id')})`;  // text instead of html to avoid rendering nested links
    }).toArray().join('\n')
  }

  // convert a latex string to HTML code (with caching to speed procesing)
  latexToHTML(latex, isBlock) {
    if (this.latexCache[latex]) {
      return this.latexCache[latex];
    } else {
      try {
        var out = katex.renderToString(latex, {
          displayMode: isBlock,
          throwOnError: false
        });
        this.latexCache[latex] = out;
        return out;
      } catch (err) {
        return '<span style="color:red">' + err + '</span>'
      }
    }
  }
}


