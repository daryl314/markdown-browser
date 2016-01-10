///////////////////////////////////////
// EXTENDED MARKDOWN CODEMIRROR MODE //
///////////////////////////////////////

// RESOURCES
//   markdown syntax: http://daringfireball.net/projects/markdown/basics
//   markdown basics: https://help.github.com/articles/markdown-basics/
//   GFM basics: https://help.github.com/articles/github-flavored-markdown/
//   javascript regex: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
//   codemirror manual: https://codemirror.net/doc/manual.html
//   codemirror simple mode demo: https://codemirror.net/demo/simplemode.html
//   codemirror markdown mode demo: http://codemirror.net/mode/markdown/
//   regex tester: https://regex101.com/#javascript

var headerRegex = /^\s*#+.*/;

// Define a CodeMirror mode for markdown editor
// CodeMirror.defineSimpleMode("gfm", {
//   start: [
//     { regex:/!?\[((?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*)\]\(\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*\)/, token:['link','string']},
//     { regex:/```/, token: 'comment', next:'code' },
//     { regex:/   .+/, token:'comment', sol:true },
//     { regex:/`.+`/, token:'comment'},
//     { regex:/ *#+.*/, token:'header', sol:true },
//     { regex:/ *\*.*/, token:'variable-2', sol:true },
//     { regex:/ *\d+\. .*/, token:'variable-2', sol:true },
//     { regex:/\*{2}.+?\*{2}/, token:'strong'},
//     { regex:/\b_.+?_\b/, token:'em'},
//     { regex:/\\\\\(.+?\\\\\)/, token:'error'},
//     { regex:/(=|\-)+/, token:'header', sol:true}
//
//
//     //{ regex:/\b_(?:__|[\s\S])+?_\b/, token:'em' },
//     //{ regex:/\b\*\*/, token:'strong', push:'strong' }
//   ],
//   code: [
//     {regex:/.*?```/, token: 'comment', next:'start'},
//     {regex:/.*/, token:'comment'}
//   ],
//   strong: [
//     { regex:/.*\*{2}\b}/, token: 'strong', pop:true },
//     { regex:/.*/, token:'string'}
//   ]
// });

// Define a CodeMirror mode for markdown editor
CodeMirror.defineMode('gfm-expanded', function(){

  // mode-scope variables go here

  // block mode data
  // blockquote, list are block recursive
  // inline lexing: heading, lheading, paragraph, b_text, html, listitem, table
  // sequence: 'b_code','fences','b_latex','heading','nptable','lheading','hr','blockquote','list','html','def','table','paragraph'
  var blockData = {
    b_code:     { seq:0,  start:/^ {4}.*/,              stop:null,        style:'b_code'      },
    fences1:    { seq:1,  start:/^ *`{3,}/,             stop:/.*`{3,}$/,  style:'fences'      },
    fences2:    { seq:2,  start:/^ *~{3,}/,             stop:/.*~{3,}$/,  style:'fences'      },
    heading:    { seq:3,  start:/^ *#+.*/,              stop:null,        style:'heading'     },
    lheading:   { seq:4,  start:/^ *(=|-){2,}.*/,       stop:null,        style:'hr'          },
    table:      { seq:5,  start:/^ *\|.*/,              stop:null,        style:'table'       }, // later in sequence??
    hr:         { seq:6,  start:/^ *( *[-*_]){3,} *$/,  stop:null,        style:'hr'          },
    blockquote: { seq:7,  start:/^ *>.*/,               stop:null,        style:'blockquote'  },
    //list
    //html
    def:        { seq:8,  start:/^ *\[.*?\]:.*/,        stop:null,        style:'def'         }
    //table
    //paragraph
  };
  var blockSequence = [];
  for (k in blockData) blockSequence[ blockData[k].seq ] = k;

  // inline mode data
  // which are recursive??
  // which need multi-line expansions??
  var inlineData = {
    i_latex:  { seq:0,  start:/^\\\\\(/, stop:/.*\\\\\)/,       style:'i_latex'   },
    b_latex:  { seq:1,  start:/^ *\$\$/, stop:/.*\$\$/,         style:'b_latex'   },
    escape:   { seq:2,  start:markdown.regex.escape,            style:'escape'    },
    autolink: { seq:3,  start:markdown.regex.autolink,          style:'link'  },
    url:      { seq:4,  start:markdown.regex.url,              style:'link'},
    tag:      { seq:5},
    link:     { seq:6,  start:markdown.regex.link,              style:['link-text','link-href','link-title']},
    reflink:  { seq:7},
    nolink:   { seq:8},
    strong1:  { seq:9,  start:/^\*\*/,   stop:/.*\*\*(?!\*)/,  style:'strong'  },
    strong2:  { seq:10, start:/^__/,     stop:/.*__(?!_)/,     style:'strong'  },
    em1:      { seq:11, start:/^\b_/,    stop:/.*_\b/,         style:'em'      },
    em2:      { seq:12, start:/^\*/,     stop:/.*\*(?!\*)/,    style:'em'      },
    i_code:   { seq:13 }, //(needs backtick capture)
    br:       { seq:14 },
    del:      { seq:15, start:/^~~(?=\S)/, stop:/.*\S~~/,  style:'strikethrough'}
  }
  var inlineSequence = [];
  for (k in inlineData) inlineSequence[ inlineData[k].seq ] = k;

  /*
  NOTES:
  If there are multiple captured groups with non-captured content, need to use one of the
  following approaches:
  - search for substring matches
  - add parentheses around the non-captured content with no associated styling
  */

  return {

    // function to initialize mode state
    startState: function(basecolumn) {
      return {
        isBlock:  true,   // are we in block mode (vs inline)?
        stack:    [],     // mode data stack
        inline:   null,   // ???
        queue:    [],     // queued up tokens for subsequent styling
        children: []      // ???
      };
    },

    // function to copy current state
    copyState: function(state) {
      return {
        isBlock:  state.isBlock,
        inline:   state.inline,
        stack:    state.stack.slice(0),
        queue:    state.queue.slice(0), // copy array
        children: state.children.slice(0) // copy array
      }
    },

    // create a queue from a multi-match
    multiMatchToQueue: function(stream, state, matches, css) {
      stream.backUp(matches[0].length); // reverse match consumption
      var str = matches[0];             // full string that matches the regex
      var tok = matches.slice(1);       // captured tokens
      while (str.length > 0) {
        idx = str.indexOf(tok[0]);
        if (idx > 0) {                  // non-captured text at start of token
          state.queue.push([
            str.slice(0,idx),
            ''
          ]);
          str = str.slice(idx);
        } else if (tok.length == 0) {   // non-captured text at end of token
          state.queue.push([
            str,
            ''
          ]);
          str = '';
        } else {                        // token starting at position 0
          var n = (tok[0]||'').length;
          state.queue.push([
            tok.shift() || '',
            css.shift()
          ]);
          str = str.slice(n);
        }
      }
      return this.token(stream, state); // recurse to pop off first token
    },

    // perform inline lexing MOve tO MAIN TOKEN FUNCTION???
    inlineLex: function(stream, state) {

      var match;
      for (var i = 0; i < inlineSequence.length; i++) {
        var rule_i = inlineData[ inlineSequence[i] ];
        if (rule_i.start) if (match = stream.match(rule_i.start)) {
          if (rule_i.stop) {
            state.stack.push(inlineSequence[i]);
            state.isBlock = false;
          }
          if (typeof rule_i.style == 'string') {
            if (stream.pos == stream.start) throw new Error('Failed to consume anything!');
            return rule_i.style;
          } else {
            return this.multiMatchToQueue(stream, state, match, rule_i.style);
          }
        }
      }

      // if nothing matched the line, try matching against inline text
      var match;
      if (match = stream.match(markdown.regex.i_text)) {
        if (stream.peek() == '_' && match[0].match(/\w$/)) { // internal _
          stream.eat(/_+/);  // consume to prevent identification as 'em'
        }
        return null;
      }

      //i_text: { seq:2, start:markdown.regex.i_text, stop:null, style:null }

      // otherwise we have an error (style as an error instead??)
      throw new Error('Failed to consume an inline token!');
    },

    // main token processing function
    token: function(stream, state) {

      // check for queued tokens
      if (state.queue.length > 0) {
        var item = state.queue.shift(1);
        stream.match(item[0]);
        if (item[0].length == 0) {
          return this.token(stream,state);
        } else {
          if (stream.pos == stream.start) throw new Error('Failed to consume anything!');
          return item[1];
        }
      }

      // if stack is empty, we are in root block mode, so search for block tokens
      if (state.stack.length == 0) {
        for (var i = 0; i < blockSequence.length; i++) {
          var rule_i = blockData[ blockSequence[i] ];
          if (rule_i.start && stream.match(rule_i.start)) {
            if (rule_i.stop) {
              state.stack.push(blockSequence[i]);
            }
            if (stream.pos == stream.start) throw new Error('Failed to consume anything!');
            return rule_i.style;
          }
        }
        // no block rules matched, so switch to inline for this token
        return this.inlineLex(stream, state);
      }

      // if we are in block mode with a non-empty stack, search for the closing tag
      if (state.isBlock) {
        var data = blockData[state.stack[state.stack.length-1]];
        if (stream.match(data.stop)) {
          state.stack.pop();
        } else {
          stream.skipToEnd();
        }
        if (stream.pos == stream.start) throw new Error('Failed to consume anything!');
        return data.style;
      }

      // if we are in inline mode with a non-empty stack, search for the closing tag
      if (!state.isBlock) {
        var data = inlineData[state.stack[state.stack.length-1]];
        if (stream.match(data.stop)) {
          state.stack.pop();
          if (state.stack.length == 0 || blockData[state.stack[state.stack.length-1]]) {
            state.isBlock = true;
          }
        } else {
          stream.skipToEnd();
        }
        if (stream.pos == stream.start) throw new Error('Failed to consume anything!');
        return data.style;
      }

      // if we get here, it's because nothing matched (which shouldn't happen!)
      throw new Error('Failed to match a token!');
    }
  }
})


////////////////////////////
// CACHED LATEX RENDERING //
////////////////////////////

// convert a latex string to HTML code (with caching to speed procesing)
var cachedLatex = {}; // cache
function latexToHTML(latex, isBlock) {
  if (cachedLatex[latex]) {
    return cachedLatex[latex];
  } else {
    try {
      out = katex.renderToString(latex, {
        displayMode: isBlock,
        throwOnError: false
      });
      cachedLatex[latex] = out;
      return out;
    } catch (err) {
      return '<span style="color:red">' + err + '</span>'
    }
  }
}


////////////////////////
// MARKDOWN RENDERING //
////////////////////////

// function to render markdown into the specified element
renderMarkdown = function(x, $el) {

  // populate specified element with text converted to markdown
  $el.html(markdown.toHTML(x
    .replace(/\[TOC\]/gi, '<toc></toc>') // TOC jQuery can find
  ,{includeLines:true}));

  // process <latex> tags in rendered markdown
  $el.find('latex.block' ).each(function(){ $(this).html( latexToHTML($(this).html(), true ) ) });
  $el.find('latex.inline').each(function(){ $(this).html( latexToHTML($(this).html(), false) ) });

  // create a table of contents
  var toc = markdown.toHTML(
    $(':header').not('h1').map(function(){
      var level = parseInt($(this).prop("tagName").slice(1));
      return Array(1+2*(level-1)).join(' ') + "* ["+$(this).html()+"](#"+$(this).attr('id')+")";
    }).toArray().join('\n'));

  // fill TOC elements
  $el.find('toc').html(toc);

  // style tables
  $el.find('table').addClass('table table-striped table-hover table-condensed');
  $el.find('thead').addClass('btn-primary');

  // perform syntax highlighting
  $el.find('pre code').each(function(i, block) { hljs.highlightBlock(block); });

  // create bootstrap alert boxes
  $el.find('p').filter( function(){ return $(this).html().match(/^NOTE:/i   ) } ).addClass('alert alert-info'   )
  $el.find('p').filter( function(){ return $(this).html().match(/^WARNING:/i) } ).addClass('alert alert-warning')

  // return data to caller
  return {
    toc: toc
  };

}


/////////////////////////
// CODEMIRROR HANDLING //
/////////////////////////

// average adjacent points
collapseRepeated = function(x_vec, y_vec) {
  var head = 0, tail = 0;
  while (tail < x_vec.length) {
    if (tail+1 < x_vec.length && x_vec[tail] == x_vec[tail+1]) {
      var x_tail = x_vec[tail];
      var sum    = y_vec[tail];
      var count = 1;
      while (x_vec[++tail] == x_tail) {
        sum += y_vec[tail];
        count++;
      }
      x_vec[head  ] = x_tail;
      y_vec[head++] = sum / count;
    } else {
      x_vec[head  ] = x_vec[tail  ];
      y_vec[head++] = y_vec[tail++];
    }
  }
  x_vec.splice(head, tail-head);
  y_vec.splice(head, tail-head);
}

// interpolate data to a linear range
interpolate = function(x_vec, y_vec, xi, xf) {
  var out = [], x1, x2, y1, y2, m;
  collapseRepeated(x_vec, y_vec);
  var updateSlope = function(){
    x1 = x2; x2 = x_vec.shift();
    y1 = y2; y2 = y_vec.shift();
    m = (y2-y1)/(x2-x1);
  }
  updateSlope(); updateSlope(); // grab first 2 points
  for (var x = xi; x < xf; x++) {
    if (x > x2 && x_vec.length > 0) {
      updateSlope();  // update slope if outside range and still have data
    }
    out.push(y1 + m*(x-x1)); // add interpolated point to output array
  }
  return out;
}

// return locations of lines in editor window
visibleLines = function(cm){
  var scrollInfo = cm.getScrollInfo();
  var topLine    = cm.lineAtHeight(scrollInfo.top                          , 'local');
  var bottomLine = cm.lineAtHeight(scrollInfo.top + scrollInfo.clientHeight, 'local');
  var maxLine    = cm.lineCount() - 1;
  return {
    top:    topLine,
    bottom: Math.min(maxLine, bottomLine),
    cursor: Math.min(maxLine, cm.getCursor().line)
  }
}

// line number lookup array
var lineMap;

// scroll to the specified line number
var scrollTo = function(line, marker) {
  if (marker == "bottom") {
    $('#viewer-container').scrollTop(lineMap[line-1] - $('#viewer-container').height());
  } else if (marker == "center") {
    $('#viewer-container').scrollTop(lineMap[line-1] - $('#viewer-container').height()*0.5);
  } else {
    $('#viewer-container').scrollTop(lineMap[line-1]);
  }
}

// function to render markdown
var render = function(){

  // execute rendering
  renderMarkdown(cm.getValue(),$('#viewer'));

  // capture line numbers
  var x = [], y = [];
  var lineRefs = $('section#viewer-container [data-source-line]').each( function(){
    x.push( parseInt($(this).attr('data-source-line')) );
    y.push( $(this).position().top                     );
  })

  // interpolate/extrapolate to create a line number lookup array
  lineMap = interpolate(x, y, 1, cm.lastLine());

  // scroll to the cursor location
  scrollTo(visibleLines(cm).cursor, 'center');

}


///////////////////
// LAUNCH EDITOR //
///////////////////

$(function(){

  // test function
  window.test = function(){
    var $el = $('section#viewer-container');
    $el.html(mdToHTML(cm.getValue(), regex));

    // style tables
    $el.find('table').addClass('table table-striped table-hover table-condensed');
    $el.find('thead').addClass('btn-primary');

    // perform syntax highlighting
    $el.find('pre code').each(function(i, block) { hljs.highlightBlock(block); });

    // create bootstrap alert boxes
    $el.find('p').filter( function(){ return $(this).html().match(/^NOTE:/i   ) } ).addClass('alert alert-info'   )
    $el.find('p').filter( function(){ return $(this).html().match(/^WARNING:/i) } ).addClass('alert alert-warning')

    return mdToHTML(cm.getValue(), regex, true);
  }

  // starter text for editor
  $('textarea#editor').text(md_test + gfm_test);

  // convert textarea to CodeMirror editor
  window.cm = CodeMirror.fromTextArea($('#editor')[0], {
    mode:         "gfm-expanded",
    theme:        "elegant",
    lineNumbers:  true,
    lineWrapping: true,
    underscoresBreakWords: false,
    taskLists: true,
    fencedCodeBlocks: true,
    strikethrough: true,
    extraKeys:    {
      "Ctrl-Q": function(cm){ cm.foldCode(cm.getCursor()); },
      "Enter": "newlineAndIndentContinueMarkdownList"
    },
    foldGutter:   true,
    gutters:      ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
  });

  // render starter text and re-render on text change
  render();
  cm.on('change', _.debounce(render, 300, {maxWait:1000})); // render when typing stops

  // synchronize scrolling
  scrollSync = _.debounce(function(a){scrollTo(visibleLines(a).top)}, 100, {maxWait:100});
  cm.on('scroll', scrollSync);
  cm.on('scroll', scrollSync);

});
