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
    list:       { seq:8,  start:/^ *(?:[*+-]|\d+\.)/,   stop:null,        style:'list'        },
    def:        { seq:9,  start:/^ *\[.*?\]:.*/,        stop:null,        style:'def'         }
  };
  var blockSequence = [];
  for (k in blockData) blockSequence[ blockData[k].seq ] = k;

  // callback functions for list mode
  // a list is terminated by one of the following:
  //  - HR block
  //  - def block
  //  - 2+ newlines followed by a non-indented line
  blockData.list.init = function(obj, stream, state, match){
    state.stack = [['list', {
      isFirstMatch: true
    }]];
  }
  blockData.list.process = function(obj, stream, state){
    var data = state.stack[state.stack.length-1][1];
    if (data.isFirstMatch) {
      data.isFirstMatch = false;
      stream.match(/.*/);
      return obj.assignToken(stream, state, blockData.list.style);
    } else if (stream.match(blockData.def.start, false)     // HR block
            || stream.match(blockData.hr .start, false)) {  // def block
      state.stack = [];
      return obj.token(stream, state);
    } else if (!stream.match(/^ /, false) && state.blanks >= 1) { // non-indented line
      state.stack = [];
      return obj.token(stream, state);
    } else {
      stream.match(/.*/);
      return obj.assignToken(stream, state, blockData.list.style);
    }
  }

  // inline mode data
  // which are recursive??  strong/em/del/link(text)
  var inlineData = {
    i_latex:  { seq:0,  start:/^\\\\\(/,    stop:/.*\\\\\)/,      recursive:false,  style:'i_latex'                               },
    b_latex:  { seq:1,  start:/^ *\$\$/,    stop:/.*\$\$/,        recursive:false,  style:'b_latex'                               },
    escape:   { seq:2,  start:markdown.regex.escape,              recursive:false,  style:'escape'                                },
    autolink: { seq:3,  start:markdown.regex.autolink,            recursive:false,  style:'link'                                  },
    url:      { seq:4,  start:markdown.regex.url,                 recursive:false,  style:'link'                                  },
    html:     { seq:5,  start:markdown.regex.tag,                 recursive:false,  style:'html'                                  },
    link:     { seq:6,  start:markdown.regex.link,                recursive:true,   style:['link-text','link-href','link-title']  },
    reflink:  { seq:7,  start:markdown.regex.reflink,             recursive:true,   style:['link-text','link-href']               },
    nolink:   { seq:8,  start:markdown.regex.nolink,              recursive:true,   style:'link-href'                             },
    strong1:  { seq:9,  start:/^\*\*/,      stop:/\*\*(?!\*)/,  recursive:true,   style:'strong'                                },
    strong2:  { seq:10, start:/^__/,        stop:/__(?!_)/,     recursive:true,   style:'strong'                                },
    em1:      { seq:11, start:/^\b_/,       stop:/_\b/,         recursive:true,   style:'em'                                    },
    em2:      { seq:12, start:/^\*/,        stop:/\*(?!\*)/,    recursive:true,   style:'em'                                    },
    i_code:   { seq:13, start:/^ *(`+)/,    stop:null,            recursive:false,  style:'i_code'                                },
    del:      { seq:14, start:/^~~(?=\S)/,  stop:/\S~~/,        recursive:true,   style:'strikethrough'                         }
  }
  var inlineSequence = [];
  for (k in inlineData) inlineSequence[ inlineData[k].seq ] = k;

  // callback function for inline code mode
  inlineData.i_code.init = function(obj, stream, state, match) {
    inlineData.i_code.stop = new RegExp('.*?[^`]\s*' + match[1] + '(?!`)');
  }

  // callback function for html mode
  inlineData.html.init = function(obj, stream, state, match) {
    var cap;
    if (cap = match[0].match(/^<\w+.*?>/)) {
      if (!cap[0].match(/\/>$/)) { // ignore self-closers
        state.isBlock = false;
        state.stack.push(['html', {
          closingTag: cap[0].replace(/^<(\w+).*/, '</$1>')
        }]);
      }
    }
  }
  inlineData.html.process = function(obj, stream, state) {
    var data = state.stack[state.stack.length-1][1];
    stream.match(/[^<]*/);  // consume any non-tag text
    if (!stream.eol()) {
      var cap;
      if (cap = stream.match(/<\/\w+.*?>/)) {
        while (state.stack.length > 0
            && state.stack[state.stack.length-1][0] == 'html'
            && state.stack[state.stack.length-1][1].closingTag !== cap[0]) {
          state.stack.pop();
        }
        state.stack.pop();
      } else if (cap = stream.match(this.start)) {
        this.init(obj, stream, state, cap);
      } else { // Isolated < that is not part of a tag
        if (!stream.eat('<')) {
          throw new Error('Failed to consume a token')
        }
      }
    }
    return obj.assignToken(stream, state, inlineData.html.style);
  }


  ///// RETURN THE MODE OBJECT /////

  return {

    // function to initialize mode state
    startState: function(basecolumn) {
      return {
        isBlock:  true,   // are we in block mode (vs inline)?
        isList:   false,  // are we in block list mode? (block mode submode)
        isBQ:     false,  // are we in block quote mode? (block mode submode)
        blanks:   0,      // number of blank lines
        stack:    [],     // mode data stack
        queue:    []      // queued up tokens for subsequent styling
      };
    },

    // function to copy current state
    copyState: function(state) {
      return {
        isBlock:  state.isBlock,
        isList:   state.isList,
        isBQ:     state.isBQ,
        blanks:   state.blanks,
        stack:    state.stack.slice(0), // copy of array
        queue:    state.queue.slice(0)  // copy of array
      }
    },

    // function called when a blank line is passed over
    blankLine: function(state) {
      state.blanks += 1;
    },

    // create a queue from a multi-match (multiple tokens to style in a single match)
    multiMatchToQueue: function(stream, state, matches, css) {
      stream.backUp(matches[0].length); // reverse match consumption
      var str = matches[0];             // full string that matches the regex
      var tok = matches.slice(1);       // captured tokens
      while (str.length > 0) {          // while there is content to process...
        idx = str.indexOf(tok[0]);      //   identify location of next match
        if (idx > 0) {                  //   if there is non-captured text at start of token...
          state.queue.push([            //     queue up an unstyled token...
            str.slice(0,idx),           //       that is the non-captured text
            ''                          //       with no css class
          ]);                           //     ...
          str = str.slice(idx);         //     remove text from string
        } else if (tok.length == 0) {   //   if there is non-captured text at the end of token...
          state.queue.push([            //     queue up an unstyled token...
            str,                        //       that is the non-captured text
            ''                          //       with no css class
          ]);                           //     ...
          str = '';                     //     done processing string
        } else {                        //   otherwise there is a token starting at position 0...
          var n = (tok[0]||'').length;  //     length of the token
          state.queue.push([            //     queue up a styled token...
            tok.shift() || '',          //       that is the captured token (removed from list)
            css.shift()                 //       with the defined style (removed from list)
          ]);                           //     ...
          str = str.slice(n);           //     remove text from string
        }                               //   ...
      }                                 // ...
      return this.token(stream, state); // recurse to pop first token off generated queue
    },

    // function called when a style is assigned
    assignToken(stream, state, style) {
      if (stream.pos == stream.start) // check that a token was consumed
        throw new Error('Failed to consume anything!');
      if (stream.eol() && state.stack.length == 0)               // return to block mode at end of line
        state.isBlock = true;
      state.blanks = 0;               // reset blank line counter
      return style;                   // return the style
    },

    // consume inline text
    consumeInlineText: function(stream, state) {
      var match;
      if (match = stream.match(markdown.regex.i_text)) {
        if (stream.peek() == '_') {
          var token_type = (state.stack[state.stack.length-1] || [''])[0];
          if (token_type === 'em1' || token_type === 'strong2') {
            if (stream.match(inlineData[token_type].stop, false)) {
              return true;
            }
          }
          if (match[0].match(/\w$/)) { // internal _
            stream.eat(/_+/);  // consume to prevent identification as 'em'
            this.consumeInlineText(stream, state); // continue consumption
          }
        }
        return true;
      } else {
        return false;
      }
    },

    // perform inline lexing MOve tO MAIN TOKEN FUNCTION???
    inlineLex: function(obj, stream, state) {

      var match;
      for (var i = 0; i < inlineSequence.length; i++) {
        var rule_i = inlineData[ inlineSequence[i] ];
        if (rule_i.start) if (match = stream.match(rule_i.start)) {
          if (rule_i.init) {
            rule_i.init(obj, stream, state, match);
          }
          if (rule_i.stop) {
            state.stack.push([inlineSequence[i], {}]);
            state.isBlock = false;
          }
          if (typeof rule_i.style == 'string') {
            return this.assignToken(stream, state, rule_i.style);
          } else {
            return this.multiMatchToQueue(stream, state, match, rule_i.style.slice(0));
          }
        }
      }

      // if nothing matched the line, try matching against inline text
      if (this.consumeInlineText(stream, state)) {
        state.isBlock = false;
        return this.assignToken(stream, state, null);
      } else {
        // otherwise we have an error (style as an error instead??)
        throw new Error('Failed to consume an inline token!');
      }
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
          return this.assignToken(stream, state, item[1]);
        }
      }

      // empty stack and in block mode: in base block mode
      //  - search for block tokens
      if (state.stack.length == 0 && state.isBlock) {
        for (var i = 0; i < blockSequence.length; i++) {
          var rule_i = blockData[ blockSequence[i] ];
          var match;
          if (rule_i.start) if (match = stream.match(rule_i.start)) {
            if (rule_i.init) rule_i.init(this, stream, state, match);
            if (rule_i.stop) state.stack.push([blockSequence[i], {}]);
            return this.assignToken(stream, state, rule_i.style);
          }
        }
      }

      // empty stack and in inline mode (or in block mode and nothing matched)
      //  - perform inline lexing
      if (state.stack.length == 0) {
        return this.inlineLex(this, stream, state);
      }

      ///// EVERYTHING BELOW USES THE STACK /////

      var stackKey  = state.stack[state.stack.length-1][0];
      var stackData = state.stack[state.stack.length-1][1];
      var stackMeta = (state.isBlock ? blockData : inlineData)[stackKey];

      // check for a special mode stack
      if (stackMeta && stackMeta.process) {
        return stackMeta.process(this, stream, state);
      }

      // if we are in block mode with a non-empty stack, search for the closing tag
      if (state.isBlock) {
        if (stream.match(stackMeta.stop)) {
          state.stack.pop();
        } else {
          stream.skipToEnd();
        }
        return this.assignToken(stream, state, stackMeta.style);
      }

      // if we are in inline mode with a non-empty stack, search for:
      //   - the closing tag
      //   - another inline opening tag
      if (!state.isBlock) {
        if (stackMeta.recursive) this.consumeInlineText(stream, state);
        if (stream.match(stackMeta.stop)) {
          state.stack.pop();
          if (state.stack.length == 0 || blockData[stackKey]) {
            state.isBlock = true;
          }
          return this.assignToken(stream, state, stackMeta.style);
        } else {
          if (stream.eol()) {
            return this.assignToken(stream, state, stackMeta.style);
          } else {
            return this.inlineLex(this, stream, state);
          }
        }
      }

      // if we get here, it's because nothing matched (which shouldn't happen!)
      throw new Error('Failed to consume a block token!');
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
