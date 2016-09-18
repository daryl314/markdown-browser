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

  // function to create a fake stream object
  fakeStream = function(text) {
    return {
      pos:      0,
      string:   text,
      match:    function(pat, flag) {
        if (typeof pat === 'string') {    // does stream start with a string?
          if (pat === this.string.slice(  //   compare search string to stream...
                this.pos,                 //     from current position
                this.pos+pat.length)      //     to offset matching pattern length
              ) {                         //   and if comparison matched...
            if (!(flag === false))        //     if flag is false...
              this.pos += pat.length;     //       advance stream
            return pat;                   //     return matched string
          } else {                        //   otherwise...
            return undefined;             //     return undefined
          }
        } else {                          // does stream match a regular expression?
          var match = this.string         //   match variable is stream...
            .slice(this.pos)              //     starting from current position
            .match(pat);                  //     matched to regex
          if (!(flag === false) && match) //   if string matched and flag is false...
            this.pos += match[0].length;  //     advance stream
          return match;                   //   return regex match results
        }
      },
      token:    function(obj, state, css) {
        var queue = [];                             // list of processed tokens
        while (!this.eol()) {                       // while there is text to consume...
          var start = this.pos;                     //   store starting position
          var tok = obj.token(this, state)          //   call token method on stream to get style
                    || css;                         //     with a default of the passed style
          queue.push([                              //   add a token to the list...
            this.string.slice(start, this.pos),     //     with the matched text
            tok]);                                  //     and the identified style
        }                                           //
        return queue;                               // return the list of styled tokens
      },
      skipToEnd:function()    { this.pos = this.string.length         },
      eat:      function(pat) { return this.match(pat)                },
      current:  function()    { return this.string.slice(0,this.pos)  },
      peek:     function()    { return this.string[this.pos]          },
      eol:      function()    { return this.pos >= this.string.length },
      sol:      function()    { return this.pos == 0                  },
      backUp:   function(n)   { this.pos -= n                         }
    }
  }

  // block mode data
  var blockData = function(){
    var blockData = {
      b_code:     { seq:0,  start:/^ {4}.*/,              stop:null,        style:'solar-red'           },
      fences1:    { seq:1,  start:/^ *`{3,}/,             stop:/.*`{3,}$/,  style:'solar-red'           },
      fences2:    { seq:2,  start:/^ *~{3,}/,             stop:/.*~{3,}$/,  style:'solar-red'           },
      heading:    { seq:3,  start:/^ *#+ /,               stop:null,        style:'header solar-violet' },
      lheading:   { seq:4,  start:/^ *(=|-){2,} *$/,      stop:null,        style:'hr solar-violet'     },
      table:      { seq:5,  start:/^ *\|.*/,              stop:null,        style:'solar-blue'          },
      hr:         { seq:6,  start:/^ *( *[-*_]){3,} *$/,  stop:null,        style:'hr solar-violet'     },
      blockquote: { seq:7,  start:/^ *>/,                 stop:null,        style:'solar-green'         },
      list:       { seq:8,  start:/^ *(?:[*+-]|\d+\.) /,  stop:null,        style:'solar-magenta'       },
      def:        { seq:9,  start:/^ *\[.*?\]:.*/,        stop:null,        style:'solar-cyan'          }
    };

    // sequence of rule names
    var blockSequence = [];
    for (k in blockData) blockSequence[ blockData[k].seq ] = k;
    blockData.blockSequence = blockSequence;

    // callback functions for blockquote mode
    blockData.blockquote.init = function(obj, stream, state, match) {
      state.pushState('blockquote', true, obj.startState());
    }
    blockData.blockquote.process = function(obj, stream, state, match) {

      // rewind match
      stream.backUp(match ? match[0].length : 0);

      // terminate blockquote if line doesn't match pattern
      if (!stream.match(blockData.blockquote.start,false)) {
        while (state.nested)              // while there are states on stack...
          state.popState()                //   remove state to clear stack
        return obj.token(stream, state);  // process token normally
      }

      // initialize queue of tokens for line with blockquote leader
      var queue = [[
        stream.match(blockData.blockquote.start, false)[0],
        blockData.blockquote.style
      ]];

      // process line in nested state to generate tokens for queue
      var nested = state.stack[0].data;
      var fs = fakeStream(stream.string.slice(queue[0][0].length)); // create a dummy stream object
      queue = queue.concat(fs.token(obj, nested));

      // tokenize queue
      state.queue = queue;
      return obj.token(stream, state);
    }

    // callback functions for list mode
    //
    // a list is terminated by one of the following:
    //  - HR block
    //  - def block
    //  - 2+ newlines followed by a non-indented line
    //
    // a list item starts with an indented bullet and extends through the end
    // of the line.  subsequent lines are added if they do not start with
    // a matching bullet with the same indentation level
    blockData.list.init = function(obj, stream, state, match){
      state.pushState('list', true, {
        isFirstMatch:   true, // don't check for end of list if it's the first line
        stack:          [],   // stack for nested list items
        copy: function(){
          var obj = { isFirstMatch: this.isFirstMatch, stack: [], copy:this.copy };
          for (var i = 0; i < this.stack.length; i++) {
            obj.stack.push({
              indentation:  this.stack[i].indentation,
              innerState:   this.stack[i].innerState.copy(),
              regex:        this.stack[i].regex
            });
          }
          return obj;
        }
      });
    }
    blockData.list.process = function(obj, stream, state, match){
      var data = state.nested.data;

      // terminate list if one of the conditions is met
      if (!data.isFirstMatch && (                                 // not first match
              (  stream.match(blockData.def.start, false))        // HR block
          ||  (  stream.match(blockData.hr .start, false))        // def block
          ||  (! stream.match(/^ /, false) && state.blanks >= 1)  // non-indented line
      )) {
        while (state.nested)              // while there are states on stack...
          state.popState()                //   remove state to clear stack
        return obj.token(stream, state);  // process token normally

      // otherwise process list item
      } else {

        // if this is the first match of the list...
        if (data.isFirstMatch) {
          data.isFirstMatch = false;      // enable search for end of list (no longer first line)
          stream.backUp(match[0].length); // reverse capture of bullet
        }

        // if we are inside a list item, check to see if current line terminates any existing items
        if (data.stack.length > 0) {
          for (var i = 0; i < data.stack.length; i++) {
            var indentation = data.stack[i].indentation;
            if (stream.match(indentation, false)) {   // matching bullet with same indentation
              data.stack = data.stack.slice(0, i-1);  // terminate previous item
              break;                                  // stop looping
            }
          }
        }

        // create a queue of tokens for line
        var queue = [];

        // reference to current nested state
        var nested = data.stack[ data.stack.length - 1 ];

        // check whether there is an open latex block on the stack.  symbols in latex can look like
        // list markers, so new line detection needs to be turned off in this case
        var openLatex =
          nested != null                      // have nested...
          && nested.innerState != null        // and nested.innerState...
          && nested.innerState.nested != null // and nested.innerState.nested...
          && (                                // and nested state is either...
               nested.innerState.nested.stateName == 'i_latex'  // inline latex
            || nested.innerState.nested.stateName == 'b_latex'  // or block latex
          );

        // if line starts with a bullet, create a new nested state
        // otherwise match leading whitespace
        var match;
        if (!openLatex && (match = stream.match(blockData.list.start, false))) {
          queue.push([                        // push styled bullet to queue
            match[0],                         //   text matching bullet
            blockData.list.style]);           //   style for a bullet
          nested = {                          // create new nested state...
            indentation: match[0],            //   leading bullet and whitespace
            innerState: obj.startState(),     //   nested state object
            regex: new RegExp(                //   regex to match whitespace
              '^ {0,' + match[0].length + '}'
            )
          };
          data.stack.push(nested);  // push new nested state to stack
        } else {
          match = stream.match(nested.regex, false);
          queue.push([match[0], null]); // push whitespace to queue
        }

        // process line in nested state to generate tokens for queue
        var fs = fakeStream(stream.string.slice(match[0].length)); // create a dummy stream object
        queue = queue.concat(fs.token(obj, nested.innerState)); // append processed tokens to queue

        // tokenize queue
        state.queue = queue;
        return obj.token(stream, state);
      }
    }

    // callback function for table mode: perform inline lexing of table cells
    blockData.table.process = function(obj, stream, state) {

      // reverse capture
      stream.backUp(stream.current().length);

      // split row into cells
      var cols = stream.match(/.*/, false)[0].split('|'); // split row into cells

      // queue for tokens
      var queue = [];

      // iterate over cells
      for (var i = 0, col = cols[0]; i < cols.length; i++, col = cols[i]) {

        // switch to inline mode
        state.isBlock = false;

        // create a dummy stream object with current cell
        var fs = fakeStream(col);

        // tokenize cell and add tokens to queue
        queue = queue.concat(fs.token(obj, state, blockData.table.style));

        // add stylized pipe after token unless final column
        if (i+1 < cols.length)
          queue.push(['|', blockData.table.style]);

        // break out of inline mode
        state.stopInline();
      }

      // assign list of tokens to state queue
      state.queue = queue;

      // return table style for leading pipe
      return blockData.table.style;
    }

    // callback function for heading mode: perform inline lexing of line
    blockData.heading.process = function(obj, stream, state) {

      // create a dummy stream, tokenize it, and add tokens to state queue
      var fs = fakeStream(stream.string.slice(stream.pos));
      state.queue = fs.token(obj, state, blockData.heading.style);

      // break out of inline mode
      state.stopInline();

      // return heading style
      return blockData.heading.style;
    }

    // return the object
    return blockData;
  }();

  // inline mode data
  var inlineData = function(){
    var inlineData = {
      i_latex:  { seq:0,  start:/^\\\\\(/,    stop:/.*?\\\\\)/,   recursive:false,  style:'solar-red'                                   },
      b_latex:  { seq:1,  start:/^ *\$\$/,    stop:/.*?\$\$/,     recursive:false,  style:'solar-red'                                   },
      escape:   { seq:2,  start:markdown.regex.escape,            recursive:false,  style:'escape solar-yellow'                         },
      autolink: { seq:3,  start:markdown.regex.autolink,          recursive:false,  style:'link solar-cyan'                             },
      url:      { seq:4,  start:markdown.regex.url,               recursive:false,  style:'link solar-cyan'                             },
      html:     { seq:5,  start:markdown.regex.tag,               recursive:false,  style:'solar-orange'                                },
      link:     { seq:6,  start:markdown.regex.link,              recursive:false,  style:['solar-cyan','link solar-cyan','solar-cyan'] }, // text, href, title
      reflink:  { seq:7,  start:markdown.regex.reflink,           recursive:false,  style:['solar-cyan','link solar-cyan']              }, // text, href
      nolink:   { seq:8,  start:markdown.regex.nolink,            recursive:false,  style:'link solar-cyan'                             }, // href
      strong1:  { seq:9,  start:/^\*\*/,      stop:/^\*\*(?!\*)/, recursive:true,   style:'strong solar-yellow'                         },
      strong2:  { seq:10, start:/^__/,        stop:/^__(?!_)/,    recursive:true,   style:'strong solar-yellow'                         },
      em1:      { seq:11, start:/^\b_/,       stop:/^_\b/,        recursive:true,   style:'em solar-yellow'                             },
      em2:      { seq:12, start:/^\*/,        stop:/^\*(?!\*)/,   recursive:true,   style:'em solar-yellow'                             },
      i_code:   { seq:13, start:/^ *(`+)/,    stop:null,          recursive:false,  style:'solar-red'                                   },
      del:      { seq:14, start:/^~~(?=\S)/,  stop:/^\S~~/,       recursive:true,   style:'strikethrough solar-yellow'                  }
    }

    // sequence of rule names
    var inlineSequence = [];
    for (k in inlineData) inlineSequence[ inlineData[k].seq ] = k;
    inlineData.inlineSequence = inlineSequence;

    // callback function for inline code mode
    inlineData.i_code.init = function(obj, stream, state, match) {
      inlineData.i_code.stop = new RegExp('.*?[^`]\s*' + match[1] + '(?!`)');
    }

    // callback function for recursive processing of link text
    inlineData.link.process = function(obj, stream, state, match) {

      // process match to get a list of style data
      var styleData = obj.processMultiMatch(stream, state, match, inlineData.link.style.slice(0));

      // set up pseudo-stream for link text
      var fs = fakeStream(styleData[1][0]);

      // tokenize link text
      var queue = fs.token(obj, state, inlineData.link.style[0]);

      // splice link text tokens into processed match data
      var tokenData = [styleData[0]].concat(queue).concat(styleData.slice(2));

      // push link tokens to state queue
      for (var i = 0; i < tokenData.length; i++) {
        obj.pushInlineToken(state, tokenData[i][0], tokenData[i][1]);
      }
    }

    // use link processing function for reflinks too
    inlineData.reflink.process = inlineData.link.process;

    // callback function for html mode initialization
    inlineData.html.init = function(obj, stream, state, match) {

      // try matching to an html tag (ignoring self-closers)
      var cap = match[0].match(/^<\w+.*?>/);
      if (cap && !cap[0].match(/\/>$/)) {

        // create a nested state for current tag
        state.pushState('html', false, {
          closingTag: cap[0].replace(/^<(\w+).*/, '</$1>')});
      }
    }

    // callback function for html mode processing
    inlineData.html.process = function(obj, stream, state) {
      var cap; // variable to hold captured matches

      // html mode data
      var data = state.nested.data;

      // consume any non-tag text
      if (stream.match(/[^<]+/)) {
        return obj.assignToken(stream, state, null);
      }

      // if there is text to consume ...
      if (!stream.eol()) {

        // if stream matches a closing tag...
        if (cap = stream.match(/<\/\w+.*?>/)) {

          // close nested html states that don't match closing tag
          while (state.nested                                 // have a nested state
              && state.nested.stateName == 'html'             // nested state is html state
              && state.nested.data.closingTag !== cap[0]) {   // nested state closing tag doesn't match current tag
            state.popState();                                 // remove nested state from stack
          }

          // close nested html state that does match closing tag
          state.popState();

        // if stream matches a new opening tag, create a new nested state
        } else if (cap = stream.match(this.start)) {
          this.init(obj, stream, state, cap);

        // otherwise consume isolated < that is not part of a tag
        } else {
          if (!stream.eat('<'))
            throw new Error('Failed to consume a token')
          else
            return obj.assignToken(stream, state, null);
        }
      }

      // style matching text with html style
      return obj.assignToken(stream, state, inlineData.html.style);
    }

    // return the object
    return inlineData;

  }();

  ///// RETURN THE MODE OBJECT /////
  return {

    // function to initialize mode state
    startState: function(basecolumn) {

      // reference to 'this'
      var _this = this;

      // create a default object
      var obj = {
        isBlock:  true,     // are we in block mode (vs inline)?
        blanks:   0,        // number of blank lines
        stack:    [],       // mode data stack
        queue:    [],       // queued up tokens for subsequent styling
        nested:   undefined // pointer to innermost nested state
      };

      // attach function to break out of inline mode
      obj.stopInline = function() {
        while (this.nested && !this.isBlock) {
          this.popState(); // remove nested inline states from top of stack
        }
      }

      // attach function to push a state to the stack
      obj.pushState = function(stateName, isBlock, stateData) {
        this.isBlock = isBlock;
        this.nested = {
          stateName:  stateName,
          isBlock:    isBlock,
          isInline:   !isBlock,
          data:       stateData||{},
          metaData:   (isBlock ? blockData : inlineData)[ stateName ]
        }
        this.stack.push(this.nested);
      }

      // attach function to pop a state from the stack
      obj.popState = function() {
        this.stack.pop();
        this.nested = this.stack[ this.stack.length - 1 ];
        this.isBlock = !this.nested || this.nested.isBlock;
      }

      // function to copy state
      obj.copy = function() {
        return _this.copyState(this);
      }

      // return the object
      return obj;
    },

    // function to copy current state
    copyState: function(state) {

      // initialize new object with shallow field copies
      var newState = {
        isBlock:      state.isBlock,
        blanks:       state.blanks,
        stack:        state.stack.slice(0), // copy of array
        queue:        state.queue.slice(0), // copy of array
        stopInline:   state.stopInline,
        pushState:    state.pushState,
        popState:     state.popState,
        copy:         state.copy
      }

      // copy objects in stack
      for (var i = 0; i < state.stack.length; i++) {
        newState.stack[i] = {
          stateName:  state.stack[i].stateName,
          isBlock:    state.stack[i].isBlock,
          isInline:   state.stack[i].isInline,
          data:       (state.stack[i].data && state.stack[i].data.copy)
                        ? state.stack[i].data.copy()  // use copy function if provided
                        : state.stack[i].data,        // CAUTION: link, not deep copy
          metaData:   state.stack[i].metaData         // read-only so link okay
        }
      }

      // set nested pointer
      newState.nested = newState.stack[ newState.stack.length - 1 ];

      // return new state
      return newState;
    },

    // function called when a blank line is passed over
    blankLine: function(state) {
      state.blanks += 1; // increment the blank line counter
    },

    // create a multi-match list (multiple tokens to style in a single match)
    processMultiMatch: function(stream, state, matches, css) {
      var queue = [];                   // empty list to contain token data
      var str = matches[0];             // full string that matches the regex
      var tok = matches.slice(1);       // captured tokens
      while (str.length > 0) {          // while there is content to process...
        idx = str.indexOf(tok[0]);      //   identify location of next match
        if (idx > 0) {                  //   if there is non-captured text at start of token...
          queue.push([                  //     queue up an unstyled token...
            str.slice(0,idx),           //       that is the non-captured text
            ''                          //       with no css class
          ]);                           //     ...
          str = str.slice(idx);         //     remove text from string
        } else if (tok.length == 0) {   //   if there is non-captured text at the end of token...
          queue.push([                  //     queue up an unstyled token...
            str,                        //       that is the non-captured text
            ''                          //       with no css class
          ]);                           //     ...
          str = '';                     //     done processing string
        } else {                        //   otherwise there is a token starting at position 0...
          var n = (tok[0]||'').length;  //     length of the token
          queue.push([                  //     queue up a styled token...
            tok.shift() || '',          //       that is the captured token (removed from list)
            css.shift()                 //       with the defined style (removed from list)
          ]);                           //     ...
          str = str.slice(n);           //     remove text from string
        }                               //   ...
      }                                 // ...
      return queue;                     // return the list of tokens
    },

    // function called when a style is assigned
    assignToken(stream, state, style) {
      if (stream.pos == stream.start) // check that a token was consumed
        throw new Error('Failed to consume anything!');
      if (stream.eol() && !state.nested)
        state.isBlock = true;         // return to block mode at end of line
      state.blanks = 0;               // reset blank line counter
      return style;                   // return the style
    },

    // consume any tokens that match inline text regex at current stream position
    // (and return the number of characters consumed)
    consumeInlineText: function(stream, state) {

      // starting position of the stream
      var startPosition = stream.current().length;

      // attempt to match inline text regex
      var match;
      if (match = stream.match(markdown.regex.i_text)) {

        // type of token is the type at the top of the inline stack
        var token_type = (state.nested || {stateName:''}).stateName;

        // if consumption stopped at an underscore...
        if (stream.peek() == '_') {

          // if inside _xxx_ or __xxx__, check to see if stream matches a stop token
          // if it does, stream is at a new token
          if (token_type === 'em1' || token_type === 'strong2') {
            if (stream.match(inlineData[token_type].stop, false))
              return stream.current().length - startPosition; // stop inline text consumption
          }

          // if stream matches __, this is a new start token
          if (stream.match(inlineData.strong2.start, false))
            return stream.current().length - startPosition; // stop inline text consumption

          // otherwise if this is an internal underscore, continue consumption
          if (match[0].match(/\w$/)) { // internal _
            stream.eat('_');  // consume to prevent identification as 'em'
            this.consumeInlineText(stream, state); // continue consumption
          }

        // if consumption stopped at a tilde and we are inside a 'del' token,
        // try reversing to see if this is a 'del' stop token that should not
        // be part of the inline text
        } else if (stream.peek() == '~' && token_type == 'del') {
          stream.backUp(1); // reverse and check for 'del' end token match
          if (!stream.match(inlineData.del.stop, false))
            stream.next(); // undo backUp operation if not an end token
        }

        // number of tokens consumed is difference between current position
        // and starting position
        return stream.current().length - startPosition;

      // if inline text regex didn't match, 0 characters were consumed
      } else {
        return 0;
      }
    },

    // push an inline token to the token queue (including nested styles)
    pushInlineToken: function(state, text, style) {

      // list to collect styles
      var styles = [];

      // iterate over inline styles on the stack and add their css classes to list
      for (var i = 0; i < state.stack.length; i++) {
        if (state.stack[i].isInline) { // only push inline token styles
          styles.push(state.stack[i].metaData.style);
        }
      }

      // add input style to list if it was given and it isn't in list already
      if (style != null && styles.indexOf(style) == -1)
        styles.push(style);

      // push a token to the queue with styled text
      state.queue.push([
        text,             // text to be styled
        styles.join(' ')  // assembled CSS classes
      ]);
    },

    // perform inline lexing
    inlineLex: function(obj, stream, state) {
      var match; // variable to store match data

      // iterate over inline rules
      for (var i = 0; i < inlineData.inlineSequence.length; i++) {
        var rule_i = inlineData[ inlineData.inlineSequence[i] ];

        // if the stream matches current rule, perform processing
        if (rule_i.start && (match = stream.match(rule_i.start, false))) {

          // call init method if one is defined
          if (rule_i.init)
            rule_i.init(obj, stream, state, match);

          // if rule has a stop token, add it to the stack so that it can
          // be processed on future function calls
          if (rule_i.stop)
            state.pushState(inlineData.inlineSequence[i], false);

          // if there is a process method without a stack, call it to process token
          // (stack-specific processing occurs later in stack processing)
          if (rule_i.process && !state.nested) {
            rule_i.process(obj, stream, state, match);

          // if rule matches a single style, push the token to the token list
          } else if (typeof rule_i.style == 'string') {
            this.pushInlineToken(state, match[0], rule_i.style);

          // if rule matches multiple styles, push the tokens to the token list
          } else {
            var multiMatch = this.processMultiMatch(stream, state, match, rule_i.style.slice(0));
            for (var j = 0; j < multiMatch.length; j++) {
              this.pushInlineToken(state, multiMatch[j][0], multiMatch[j][1]);
            }
          }

          // return length of the match to the caller
          return match[0].length;
        }
      }

      /***** No inline styles matched, so try matching against inline text *****/

      var startPosition = stream.current().length; // pre-match position
      var nCaptured; // number of characters captured

      // if there is inline text to consume...
      if (nCaptured = this.consumeInlineText(stream, state)) {

        // push an unstyled token to the token list
        this.pushInlineToken(state, stream.current().slice(startPosition), null);

        // turn on inline mode
        state.isBlock = false;

        // reverse match operation
        stream.backUp(stream.current().length - startPosition);

        // return number of characters captured
        return nCaptured;

      // otherwise we have an error (style as an error instead??)
      } else {
        throw new Error('Failed to consume an inline token!');
      }
    },

    // process next queued token
    processTokenQueue: function(stream, state) {

      // remove first item from queue
      var item = state.queue.shift(1);

      // match stream to item
      if (stream.match(item[0])) {

        // if a zero-length token, recurse to skip over it
        if (item[0].length == 0)
          return this.token(stream,state);

        // otherwise call the assignToken function to assign token style
        else
          return this.assignToken(stream, state, item[1]);

      // throw an exception if stream doesn't match queued token
      } else {
        throw new Error(
          'Stream does not match token!\n' +
          'Token: ' + item[0] + '\n' +
          'Stream: ' + stream.string);
      }
    },

    // perform block mode token processing
    processBlockToken: function(stream, state) {

      // variable to contain matched data
      var match;

      // iterate over block rules
      for (var i = 0; i < blockData.blockSequence.length; i++) {
        var rule_i = blockData[ blockData.blockSequence[i] ];

        // if there is a defined start rule and the stream matches it ...
        if (rule_i.start && (match = stream.match(rule_i.start))) {

          // call init method if one is defined
          if (rule_i.init)
            rule_i.init(this, stream, state, match);

          // if there is a stop rule, push it to the stack to start searching for it
          if (rule_i.stop)
            state.pushState(blockData.blockSequence[i], true);

          // if there is a process method, call it to handle processing
          if (rule_i.process)
            return rule_i.process(this, stream, state, match);

          // otherwise use normal assignToken path to set style for matched token
          return this.assignToken(stream, state, rule_i.style);
        }
      }

      // none of the rules matched, so return undefined results
      return undefined;

    },

    // perform nested inline mode processing
    processNestedInline: function(stream, state) {

      // if in a recursive mode, search for closing tag or another inline opening tag
      if (state.nested.metaData.recursive) {

        // confirm that this is an inline mode
        if (state.nested.isBlock)
          throw new Error('Internal algorithm failure')

        // store current stream position
        var startPosition = stream.current().length;

        // try matching stream to stop token
        var match = stream.match(state.nested.metaData.stop, false);
        if (match) { // if match was successful...
          this.pushInlineToken(state, match[0], null);  // push match to inline token queue
          state.popState();                             // close nested state
        } else { // otherwise continue inline lexing
          this.inlineLex(this, stream, state);
        }

        // recurse to process first token in queue
        return this.token(stream,state);

      // if in a non-recursive mode, look for closing tag
      } else {

        // capture current style (before potentially popping token)
        var css = state.nested.metaData.style;

        // if the closing tag was found, close the nested state
        if (stream.match(state.nested.metaData.stop)) {
          state.popState();

        // if no closing tag was found, consume entire line
        } else {
          stream.skipToEnd();
        }

        // style token with nested mode's style
        return this.assignToken(stream, state, css);
      }
    },

    // main token processing function
    token: function(stream, state) {

      try {

        // if there are queued tokens, process the next token in queue
        if (state.queue.length > 0) {
          return this.processTokenQueue(stream, state);
        }

        // if there is no stack, we are are in base mode and are searching for
        // a token to style.  a stack is used when we are in a nested mode and
        // need to do non-default processing
        if (!state.nested) {

          // try searching for a block token first
          // (if in block mode and at start of line)
          if (state.isBlock && stream.sol()) {
            var style = this.processBlockToken(stream, state);
            if (style !== undefined) return style; // return token style if found
          }

          // otherwise perform inline lexing
          this.inlineLex(this, stream, state);  // tokenize inline text
          return this.token(stream, state);     // recurse to grab first token on stack
        }

        // remainder of code in function uses the stack.  this is for processing
        // of a nested mode that is a continuation of a token identified in
        // base mode processing above.

        // if the nested mode has a process method, call it
        if (state.nested.metaData && state.nested.metaData.process)
          return state.nested.metaData.process(this, stream, state);

        // if we are in a nested block mode, search for the closing tag
        if (state.isBlock) {

          // save the current style (before potentially popping token)
          var css = state.nested.metaData.style;

          // if the stream matches the closing tag, exit nested mode
          // otherwise consume entire line and continue processing
          if (stream.match(state.nested.metaData.stop))
            state.popState();
          else
            stream.skipToEnd();

          // apply block style to consumed token
          return this.assignToken(stream, state, css);
        }

        // otherwise perform nested inline processing
        else {
          return this.processNestedInline(stream, state);
        }

      } catch (ex) {
        console.error(ex);
        console.log(ex.stack);
        while (state.nested) state.popState();
        stream.skipToEnd();
        return 'error solar-bg-base03';
      }

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

  // convert markdown to HTML
  var html = markdown.toHTML(
    x.replace(/\[TOC\]/gi, '<toc></toc>') // TOC jQuery can find
    ,{includeLines:true}
  );

  // process <latex> tags
  html = html.replace(/(<latex.*?>)([\s\S]*?)(<\/latex>)/g, function(match,p1,p2,p3){
    return p1 + latexToHTML(p2) + p3;
  })

  // populate specified element with text converted to markdown
  $el.html(html);

  // create a table of contents
  var toc = markdown.toHTML(
    $el.find(':header').not('h1').map(function(){
      var level = parseInt($(this).prop("tagName").slice(1));
      return Array(1+2*(level-1)).join(' ') + "* ["+$(this).html()+"](#"+$(this).attr('id')+")";
    }).toArray().join('\n'));

  // fill TOC elements
  $el.find('toc').html(toc);

  // remove line number tags from TOC entries
  $el.find('toc [data-source-line]').each(function(){
    $(this).attr('data-source-line', null)
  });

  // copy table of contents
  $('#floating-toc').html($el.find('toc').html());

  // style tables
  $el.find('table').addClass('table table-striped table-hover table-condensed');
  $el.find('thead').addClass('btn-primary');

  // perform syntax highlighting
  $el.find('pre code').each(function(i, block) { hljs.highlightBlock(block); });

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

// dump location data to matlab format
dumpPoints = function(x, y, name) {
  txt = [name + ' = ['];
  if (!x) {
    x = [];
    for (var i = 0; i < y.length; i++) {
      x.push(i+1);
    }
  }
  for (var i = 0; i < x.length; i++) {
    txt.push('    '+x[i]+' '+y[i]);
  }
  txt.push('];');
  $('#viewer').append(txt.join('<br>\n'))+'<br>\n';
}

// interpolate data to a linear range
interpolate = function(x_vec, y_vec, xi, xf) {
  var out = [], x1, x2, y1, y2, m;
  //dumpPoints(x_vec, y_vec, 'initial');
  collapseRepeated(x_vec, y_vec);
  //dumpPoints(x_vec, y_vec, 'collapsed');
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
  //dumpPoints(null, out, 'interpolated');
  return out;
}

// return locations of lines in editor window
visibleLines = function(){
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

// heading location lookup array
var headingLookup;

// counters for number of triggered scroll actions.  this lets the scrolled
// window know that its scrolling was triggered by a user scroll in the ohter
// window.  otherwise there is a circular dependency and the windows fight with
// each other
var scrollState = {
  editorCount : 0,
  viewerCount : 0
};

// function to return viewer position associated with editor position
var editorPosToViewerPos = function(line, marker) {
  var h = $('#viewer-container').height();
  if (marker == 'bottom') {
    return lineMap[line-1] - h*1;
  } else if (marker == 'center') {
    return lineMap[line-1] - h*0.5;
  } else {
    return lineMap[line-1] - h*0;
  }
}

// function to return editor position associated with viewer position
var viewerPosToEditorPos = function(line) {

  // binary search function
  function binSearch(a, b, val) {
    if (b - a == 1) {
      if (lineMap[b] == val) {
        return b;
      } else if (lineMap[a] == val) {
        return a;
      } else {
        return a + (val - lineMap[a])/(lineMap[b] - lineMap[a]);
      }
    } else {
      var m = Math.round((a+b)/2);
      if (val > lineMap[m]) {
        return binSearch(m, b, val);
      } else {
        return binSearch(a, m, val);
      }
    }
  }

  // perform search
  return Math.max(
    1,
    Math.round(
      binSearch(1, lineMap.length-1, line)
    )
  );
}

// function to return closest header to a position
var parentHeader = function(pos) {

  // binary search function
  function binSearch(a, b, val) {
    if (b - a == 1) {
      if (headingLookup[b] == val) {
        return headingLookup[b][1];
      } else if (lineMap[a] == val) {
        return headingLookup[a][1];
      } else {
        return headingLookup[a][1];
      }
    } else {
      var m = Math.round((a+b)/2);
      if (val < headingLookup[m][0]) {
        return binSearch(a, m, val);
      } else {
        return binSearch(m, b, val);
      }
    }
  }

  // perform search
  var last = headingLookup.length-1;
  if (pos > headingLookup[last][0]) {
    return headingLookup[last][1];
  } else {
    return binSearch(0, headingLookup.length-1, pos);
  }

}

// scroll preview window to the location matching specified editor line number
var scrollTo = function(line, marker) {

  // if the update count is nonzero, this was a scroll triggered by a preview
  // window scroll (and not a user scroll).  decrement the scroll count and
  // return.
  if (scrollState.editorCount > 0) {
    scrollState.editorCount -= 1;
    return
  }

  // otherwise this was a user scroll, so trigger a corresponding scroll in the
  // preview window
  else {
    scrollState.viewerCount += 1;
    $('#viewer-container').scrollTop( editorPosToViewerPos(line,marker) );
    return
  }

}

// scroll editor to line number matching specified preview scroll location
var scrollFrom = function(line) {
  //console.log("Viewer top position "+line+" --> editor line "+viewerPosToEditorPos(line));

  // identify closest header and corresponding TOC entry
  var matchingToc = parentHeader(line);

  // style closest header
  $('nav#floating-toc li').removeClass('active');
  matchingToc
    .parentsUntil('nav#floating-toc', 'li')
    .addClass('active');

  // if the update count is nonzero, this was a scroll triggered by an editor
  // window scroll (and not a user scroll).  decrement the scroll count and
  // return
  if (scrollState.viewerCount > 0) {
    scrollState.viewerCount -= 1;
    return
  }

  // otherwise this was a user scroll, so trigger a corresponding scroll in the
  // editor window
  else {
    scrollState.editorCount += 1;
    cm.scrollTo(null, cm.heightAtLine(viewerPosToEditorPos(line), 'local'));
    return
  }
}


// function to render markdown
var render = function(){

  // save cursor position
  var currentScroll = $('section#viewer-container').scrollTop();

  // execute rendering
  renderMarkdown(cm.getValue(),$('#viewer'));

  // capture line numbers
  var x = [], y = [];
  var lineRefs = $('section#viewer-container [data-source-line]').each( function(){
    x.push( parseInt($(this).attr('data-source-line'))                          );
    y.push( $(this).position().top + $('section#viewer-container').scrollTop()  );
  })

  // interpolate/extrapolate to create a line number lookup array
  lineMap = interpolate(x, y, 1, cm.lastLine());

  // capture heading locations
  headingLookup = [];
  $('#viewer-container :header').each( function(){
    var matchingToc = $("nav#floating-toc a[href='#" + $(this).attr('id') + "']");
    if (matchingToc.length > 0) {
      headingLookup.push([
        $(this).position().top + $('section#viewer-container').scrollTop(),
        matchingToc
      ])
    }
  });

  // scroll to the cursor location
  $('section#viewer-container').scrollTop(currentScroll);

}

////////////////////////////
// BRACKET CLOSING PLUGIN //
////////////////////////////

function registerCloseBrackets(){
  // adapted from CodeMirror CloseBrackets plugin

  ///////////////////
  // Configuration //
  ///////////////////

  var config = function(){

    // configuration options
    var config = {

      // adjacent pairs of single-character brackets
      pairs: "()[]{}<>''\"\"**__``",

      // pairs that can also be double brackets
      doubles: "_*",

      // pairs that can also be triple brackets
      triples: '`',

      // multi-character brackets (left side, right side)
      multiples: [
        ['$$', '$$'],
        ['~~', '~~'],
        ['\\\\(', '\\\\)']
      ],

      // special case for headings
      // keep expanding for every key press starting from a blank line and
      // skip closing bracket with keypress
      //   ^.          -->  ^#.#
      //   ^#.#$       -->  ^##.##$
      //   ^##xxx.##$  -->  ^##xxx##.$
      lineWrapper: '#',

      // characters that can be mid-string
      // (that are not expanded when part of a string)
      midString: "\"'_",

      // bracket pairs to explode when ENTER is pressed between them
      // exploding is putting an indented blank line between the brackets
      explode: [
        //LEFT    RIGHT     INDENT
        ['[',     ']',      true ],
        ['{',     '}',      true ],
        ['$$',    '$$',     true ],
        ['\\\\(', '\\\\)',  true ],
        ['```',   '```',    false]
      ]
    };

    // list of unique characters (need to bind to these)
    config.bindKeys = config.pairs;
    for (var i = 0; i < config.multiples.length; i++) {
      var allKeys = config.multiples[i].join('');
      for (var j = 0; j < allKeys.length; j++) {
        if (config.bindKeys.indexOf(allKeys[j]) == -1)
          config.bindKeys += allKeys[j];
      }
    }
    for (var i = 0; i < config.lineWrapper.length; i++)
      config.bindKeys += config.lineWrapper[i];

    // closing characters (unique doesn't matter)
    config.closers = ''
    for (var i = 1; i < config.pairs.length; i+=2)
      config.closers += config.pairs[i];
    for (var i = 0; i < config.multiples.length; i++)
      config.closers += config.multiples[i][1][0];

    // opening characters (unique doesn't matter)
    config.openers = ''
    for (var i = 0; i < config.pairs.length; i+=2)
      config.openers += config.pairs[i];
    for (var i = 0; i < config.multiples.length; i++)
      config.openers += config.multiples[i][1][0];

    // return the configuration object
    return config;
  }();


  ////////////////////
  // Initialization //
  ////////////////////

  // CodeMirror class to contain a cursor position
  var Pos = CodeMirror.Pos;

  // function to return a handler function for a character
  function handler(ch) {
    return function(cm) { return handleChar(cm, ch); };
  }

  // configure a key map for bracket handler
  var keyMap = {
    Space:      handleSpace,
    Backspace:  handleBackspace,
    Enter:      handleEnter
  };

  // extend keymap with keys in paired bracket list
  for (var i = 0; i < config.bindKeys.length; i++)
    keyMap["'" + config.bindKeys[i] + "'"] = handler(config.bindKeys[i]);

  // register plugin
  CodeMirror.defineOption(
    "autoCloseBrackets",  // plugin name
    false,                // default value: don't turn on plugin unless called out explicitly
    function(             // callback called when editor is initialized or when option is modified through setOption
      cm,                 // CodeMirror instance
      val,                // new value for 'autoCloseBrackets' option
      old                 // previous value for 'autoCloseBrackets' option
    ) {

      // value was previously true, so disable plugin
      if (old && old != CodeMirror.Init) {
        cm.removeKeyMap(keyMap);        // remove key bindings
        cm.state.closeBrackets = null;  // set closeBrackets state to null
      }

      // new value evaluates to true, so enable plugin
      if (val) {
        cm.state.closeBrackets = val;   // set closeBrackets state to true
        cm.addKeyMap(keyMap);           // add key bindings
      }
    }
  );


  //////////////////
  // Key handlers //
  //////////////////

  // handle a space bar keypress
  function handleSpace(cm) {

    // don't do anything if input is disabled (vim command mode)
    // or if there is nothing to explode
    var explode = config.explode;
    if (!explode || cm.getOption("disableInput")) return CodeMirror.Pass;

    // iterate over selections
    var ranges = cm.listSelections();
    outerLoop: for (var i = 0; i < ranges.length; i++) {
      var cur = ranges[i].head;

      // don't do anything if there is a nonzero selection (space should clear selection)
      if (!ranges[i].empty()) return CodeMirror.Pass;

      // check for a single-character pair
      var lChar = adjacentChars(cm, cur, -1);
      var rChar = adjacentChars(cm, cur,  1);
      var idx = config.pairs.indexOf(lChar);
      if (idx != -1 && idx % 2 == 0 && config.pairs[idx+1] == rChar)
        continue outerLoop;

      // check for a lineWrapper
      if (lChar == rChar && config.lineWrapper.indexOf(lChar) != -1)
        continue outerLoop;

      // check for multi-character pairs
      for (var j = 0; j < config.multiples.length; j++) {
        if (
            adjacentChars(cm, cur, -config.multiples[j][0].length) == config.multiples[j][0] &&
            adjacentChars(cm, cur,  config.multiples[j][1].length) == config.multiples[j][1]
        ) {
          continue outerLoop;
        }
      }

      // don't do anything if a bracket pair wasn't found surrounding the cursor
      return CodeMirror.Pass;
    }

    // all selections at this point are zero-length cursors surrounded by bracket pairs

    // execute the following CodeMirror commands...
    cm.operation(function() {
      execBoth(' ', ' ');
    });
  }

  // handle a backspace keypress
  function handleBackspace(cm) {
    if (isDisabled(cm)) return CodeMirror.Pass;

    // variable to contain the number of characters [L,R] to delete for each cursor
    var bracketSizes = [];

    // iterate over selections
    var ranges = cm.listSelections();
    outerLoop: for (var i = 0; i < ranges.length; i++) {

      // don't do anything if there is a nonzero selection (backspace should delete selection)
      if (!ranges[i].empty())
        return CodeMirror.Pass;

      // don't do anything if at start or end of line
      var cur = ranges[i].head;
      if (cur.ch == 0 || cm.getLine(cur.line).length == cur.ch)
        return CodeMirror.Pass;

      // characters before and after cursor
      var charsL = cur.ch;
      var charsR = cm.getLine(cur.line).length - cur.ch;

      // iterate over potential multi-character bracket pairs
      for (var j = 0; j < config.multiples.length; j++) {
        var bracketL = config.multiples[j][0];
        var bracketR = config.multiples[j][1];
        if (
            charsL >= bracketL.length &&
            charsR >= bracketR.length &&
            adjacentChars(cm, cur, -bracketL.length) == bracketL &&
            adjacentChars(cm, cur,  bracketR.length) == bracketR
        ) {
          bracketSizes.push([ bracketL.length, bracketR.length ]);
          continue outerLoop;
        }
      }

      // look for a match in single-character pair list
      var around = adjacentChars(cm,cur,-1) + adjacentChars(cm,cur,1);
      if (config.pairs.indexOf(around) % 2 == 0) {
        bracketSizes.push([ 1, 1 ]);
      }

      // otherwise nothing matched, so yield to default backspace action
      else {
        return CodeMirror.Pass;
      }
    }

    // done iterating over selections.
    // all selections at this point are zero-length cursors surrounded by bracket pairs

    // iterate over cursors in reverse order and delete bracket pairs surrounding cursor
    for (var i = ranges.length - 1; i >= 0; i--) {
      var cur = ranges[i].head;
      cm.replaceRange(
        "",
        Pos(cur.line, cur.ch - bracketSizes[i][0]),
        Pos(cur.line, cur.ch + bracketSizes[i][1]),
        "+delete"
      );
    }
  }

  // handle an enter keypress: explode bracket pairs
  function handleEnter(cm) {

    // don't do anything if input is disabled (vim command mode)
    // or if there is nothing to explode
    var explode = config.explode;
    if (!explode || cm.getOption("disableInput")) return CodeMirror.Pass;

    // is the line indented?
    var indentBracket = [];

    // iterate over selections
    var ranges = cm.listSelections();
    outerLoop: for (var i = 0; i < ranges.length; i++) {
      var cur = ranges[i].head;

      // don't do anything if there is a nonzero selection (enter should clear selection and insert newline)
      if (!ranges[i].empty()) return CodeMirror.Pass;

      // iterate over bracket pairs
      for (var j = 0; j < config.explode.length; j++) {
        if (
            adjacentChars(cm, cur, -config.explode[j][0].length) == config.explode[j][0] &&
            adjacentChars(cm, cur,  config.explode[j][1].length) == config.explode[j][1]
        ) {
          indentBracket.push(config.explode[j][2]);
          continue outerLoop;
        }
      }

      // don't do anything if a bracket pair wasn't found surrounding the cursor
      return CodeMirror.Pass;
    }

    // all selections at this point are zero-length cursors surrounded by bracket pairs

    // execute the following CodeMirror commands...
    cm.operation(function() {

      // replace selection(s) with two newlines
      cm.replaceSelection("\n\n", null);

      // move a character to the left
      cm.execCommand("goCharLeft");

      // iterate over selections
      ranges = cm.listSelections();
      for (var i = 0; i < ranges.length; i++) {

        // line associated with current selection
        var line = ranges[i].head.line;

        // indent current and subsequent line using smart indentation if available
        cm.indentLine(line    , null, true);
        cm.indentLine(line + 1, null, true);

        // indent current line again
        if (indentBracket[i])
          cm.indentLine(line, 'add', true);
      }
    });
  }


  // return the bracketing action associated with a selection and a keypress
  function bracketAction(cm, ch, range) {
    if (isDisabled(cm)) return ["none"]

    // don't do anything if character isn't in the bind list
    // this shouldn't happen, but is here as a safety check...
    if (config.bindKeys.indexOf(ch) == -1) return ["none"];

    // is this an opening or closing character?
    var isOpener = config.openers.indexOf(ch) != -1;
    var isCloser = config.closers.indexOf(ch) != -1;

    // is this an inverted range? (head before anchor)
    var isInverted =
      range.head.line < range.anchor.line ||
      range.head.ch   < range.anchor.ch;

    // get characters before and after range (or cursor if empty range)
    var lCur = isInverted ? range.head : range.anchor;
    var rCur = isInverted ? range.anchor : range.head;
    var next = cm.getRange(rCur, Pos(rCur.line, rCur.ch + 1));
    var prev = cm.getRange(Pos(lCur.line, lCur.ch - 1), lCur);


    ///// SELECTED BLOCK: SURROUND OR REPLACE SELECTION /////

    // note that (foo) expands to \\(foo\\) if 'foo' is selected and a
    // backslash is pressed

    // if there is a selection...
    //   - if backslash with text surrounded by parentheses, escape parentheses
    //   - if opening character, surround selection with brackets
    //   - otherwise allow selection to be replaced with typed character
    if (!range.empty()) {
      if (next == ')' && prev == '(' && ch == '\\') {
        return ["escape"];
      } else if (isOpener) {
        return ["surround"];
      } else {
        return ["none"];
      }
    }


    ///// THERE ISN'T A SELECTION SO THIS IS A CURSOR /////

    // reference to cursor
    var cur = range.head;


    ///// HANDLE DOUBLES /////

    // doubles are expanded when the character is pressed a second time after
    // the pair was expanded on the first key press.
    //   _._    -->  __.__
    //   __.__  -->  ___._
    if (
      config.doubles.indexOf(ch) != -1            // pressed a double key
      && adjacentChars(cm, cur, -1) === ch        // character before curor
      && adjacentChars(cm, cur,  1) === ch        // character after cursor
      && adjacentChars(cm, cur, -2) !== ch + ch   // don't have 2 of character before cursor
    ) {
      return ['both', ch, ch];
    }


    ///// HANDLE TRIPLES /////

    // triples are expanded when the character is pressed a third time after the
    // pair was expanded on the first key press.
    //   __.  -->  ___.___
    if (
      config.triples.indexOf(ch) != -1                // pressed a triple key
      && adjacentChars(cm, cur, -2) === ch + ch       // 2 characters before cursor
      && adjacentChars(cm, cur, -3) !== ch + ch + ch  // not 3 characters before cursor
    ) {
      return ['both', ch, ch+ch+ch];
    }


    ///// HANDLE LINE WRAPPERS /////

    // special case for variable number of characters that surround a line on
    // both sides (like markdown headers: ^### xxx ###$)
    //   ^#.#$    -->  ^##.##$
    //   ^##.##$  -->  ^###.###$
    if (config.lineWrapper.indexOf(ch) != -1) {
      var lineText = cm.getLine(cur.line);
      if (lineText.length == 0) {
        return ['both', ch, ch]
      } else if (lineText === repChar(ch, cur.ch * 2)) {
        return ['both', ch, ch]
      }

      // if character is a line wrapper with N to the right, jump to EOL
      var rep = repChar(ch, lineText.length-cur.ch);
      if (
          lineText.slice(  -rep.length) === rep &&
          lineText.slice(0, rep.length) === rep
      )
        return ["skip", rep.length];
    }


    ///// JUMP OVER TYPED CLOSING CHARACTER TO RIGHT OF CURSOR /////

    // typed a potential closing character and typed character follows selection
    // need to skip over this character instead of inserting a new one
    if (isCloser && next == ch) {

      // first check multiples to see if anything matches.  jump over closing
      // sequence if it matches
      for (var i = 0; i < config.multiples.length; i++) {
        var sequence = config.multiples[i][1];
        if (adjacentChars(cm, cur, sequence.length) == sequence)
          return ["skip", sequence.length];
      }

      // if character is a triple with 3 to the right, jump over 3 characters
      if (config.triples.indexOf(ch) != -1 && adjacentChars(cm, cur, 3) == ch+ch+ch)
        return ['skip', 3];

      // if character is a double with 2 to the right, jump over 2 characters
      if (config.doubles.indexOf(ch) != -1 && adjacentChars(cm, cur, 2) == ch+ch)
        return ['skip', 2];

      // if character is a singleton, move ahead one character to jump over
      // closing bracket
      var idx = config.pairs.lastIndexOf(ch);
      if (idx != -1 && idx % 2 == 1)
        return ["skip", 1];

      // otherwise take default action
      else
        return ["none"];
    }


    ///// INSERT A MID-STRING CHARACTER /////

    // if there is a word character on either side of the inserted character,
    // this means that the typed character is part of a string.  mid-string
    // characters aren't expanded.  otherwise don' would expand to don''

    // typed a character in mid-string list with word on either side,
    // so don't do any expansion
    if (config.midString.indexOf(ch) != -1 && (
        CodeMirror.isWordChar(next) || CodeMirror.isWordChar(prev)
    )) {
      return ['none'];
    }


    ///// EXPAND A MULTI-CHARACTER BRACKET /////

    // conditions for bracket expansion: it is okay to expand an opening bracket
    // if the next charater is EOL, a closing bracket, or whitespace
    var okayToExpand =
      cm.getLine(cur.line).length == cur.ch // cursor is at end of line
      || config.closers.indexOf(next) != -1 // first character following selection is a closing bracket
      || /\s/.test(next);                   // first character following selection is whitespace

    // typed the last character of a multi-character sequence (with expansion
    // conditions met), so expand multi-character bracket
    if (okayToExpand) {
      for (var i = 0; i < config.multiples.length; i++) {
        var sequence = config.multiples[i][0];

        // need enough characters in the line to match
        if (cur.ch >= sequence.length - 1) {

          // characters before selection
          var typedChars = adjacentChars(cm, cur, 1-sequence.length);

          // split up sequence
          var seqStart = sequence.slice(0, sequence.length-1);
          var seqLast  = sequence.slice(-1);

          // check if typed characters and current character match sequence.
          // return bracket expansion action if they do.
          if (seqStart == typedChars && seqLast == ch)
            return ["both", seqLast, config.multiples[i][1]];
        }
      }
    }


    ///// TYPED OPENING CHARACTER: INSERT BRACKET PAIR /////

    // typed an opening character (with expansion conditions met), so expand
    // and insert both brackets from pair
    if (isOpener && okayToExpand && config.pairs.indexOf(ch) != -1) {
      var pairIdx = config.pairs.indexOf(ch);
      return ["both", config.pairs[pairIdx], config.pairs[pairIdx+1]];
    }


    ///// NOTHING MATCHED SO DON'T TAKE ANY ACTION /////

    return ["none"];

  }

  // handle a generic keypress
  function handleChar(cm, ch) {
    if (isDisabled(cm)) return CodeMirror.Pass;

    // variable to contain type of selection
    var type;

    // iterate over selections
    var ranges = cm.listSelections(); // list of selected blocks
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];

      // determine action associated with current selection
      var curType = bracketAction(cm, ch, range);

      // if no action, allow CodeMirror to insert the character
      if (curType == "none")
        return CodeMirror.Pass;

      // save the current action if this is the first selection
      if (!type) type = curType;

      // if the current action doesn't match the first selection's action, this means
      // that there is an ambiguous operation.  Let CodeMirror do the default
      // character insertion
      if (type != curType) return CodeMirror.Pass;

    } // continue iteration

    var pos = config.pairs.indexOf(ch);
    var left = pos % 2 ? config.pairs.charAt(pos - 1) : ch; // left bracket character
    var right = pos % 2 ? ch : config.pairs.charAt(pos + 1); // right bracket character
    if (ch == '$' || ch == '~') {
      left = ch + ch;
      right = ch + ch;
    }

    // execute appropriate CodeMirror command
    cm.operation(function(){
      if      (type[0] == "skip"     ) execSkip(type[1]);
      else if (type[0] == "surround" ) execSurround(left, right);
      else if (type[0] == "both"     ) execBoth(type[1], type[2]);
      else if (type[0] == "escape"   ) execEscape();
      else throw new Error("Invalid action: "+type[0]);
    });
  }

  ///////////////////////////
  // CodeMirror operations //
  ///////////////////////////

  // given a CodeMirror selection, shrink it by specified number of characters on each side
  // to remove added brackets from the selection
  function contractSelection(sel, nLeft, nRight) {

    // is this a reverse selection (where endpoint is before the start)?
    var inverted = CodeMirror.cmpPos(sel.anchor, sel.head) > 0;

    // return a new selection representing the shrunken selection
    return {
      anchor: new Pos(sel.anchor.line, sel.anchor.ch + (inverted ? -nRight :  nLeft)),
      head  : new Pos(sel.head.line,   sel.head.ch   + (inverted ?  nLeft : -nRight))
    };
  }

  // skip specified number of characters (positive for right, negative for left)
  function execSkip(n){
    if (n > 0) {
      for (var i = 0; i < n; i++) {
        cm.execCommand("goCharRight");
      }
    } else if (n < 0) {
      for (var i = 0; i < -n; i++) {
        cm.execCommand("goCharLeft");
      }
    }
  }

  // add bracket characters around each selection.
  function execSurround(left, right){

    // surround selected text with bracket characters
    var sels = cm.getSelections();
    for (var i = 0; i < sels.length; i++)
      sels[i] = left + sels[i] + right;

    // replace selections with new text and expand selections to include new text
    cm.replaceSelections(sels, "around");

    // remove newly added brackets from each selection
    sels = cm.listSelections().slice();
    for (var i = 0; i < sels.length; i++)
      sels[i] = contractSelection(sels[i], left.length, right.length);
    cm.setSelections(sels);
  }

  // replace selection with bracket characters
  function execBoth(left, right){
    cm.replaceSelection(left + right, null); // replace selection with opening and closing brackets
    cm.triggerElectric(left + right); // trigger automatic indentation
    execSkip(-right.length); // move character(s) to left
  }

  // escape the bracket characters surrounding each selection
  function execEscape() {

    // extend selection to include left bracket character
    sels = cm.listSelections().slice();
    for (var i = 0; i < sels.length; i++)
      sels[i] = contractSelection(sels[i], -1, 0);
    cm.setSelections(sels);

    // escape bracket characters
    execSurround('\\\\', '\\\\');
  }


  ///////////////////////
  // Utility Functions //
  ///////////////////////

  // return true if bracket plugin is disabled
  function isDisabled(cm) {
    return !cm.state.closeBrackets || cm.getOption("disableInput");
  }

  // return the specified number of characters before or after cursor
  function adjacentChars(cm, cur, n) {
    if (n > 0) {
      return cm.getRange(
        cur,
        Pos(cur.line, cur.ch + n)
      );
    } else if (n < 0) {
      return cm.getRange(
        Pos(cur.line, cur.ch + n),
        cur
      );
    } else {
      return '';
    }
  }

  // repeat a character the specified number of times
  function repChar(ch, n) {
    return (new Array(n+1).join(ch))
  }


};


///////////////////
// LAUNCH EDITOR //
///////////////////

// function to initialize CodeMirror once startup text is available
function launchCodeMirror() {

  // add plugin to auto-close brackets
  registerCloseBrackets();

  // convert textarea to CodeMirror editor
  window.cm = CodeMirror.fromTextArea($('#editor')[0], {
    mode:                     "gfm-expanded", // use newly defined mode
    autofocus:                true,           // move focus to CodeMirror on init
    cursorScrollMargin:       3,              // DOES THIS WORK???
    lineNumbers:              true,           // show line numbers
    lineWrapping:             true,           // wrap long lines
    foldGutter:               true,           // enable folds in gutter
    styleActiveLine:          true,           // add css to curently active line
    matchBrackets:            true,           // enable bracket matching
    autoCloseBrackets:        true,           // automatically close brackets
    showCursorWhenSelecting:  true,           // show cursor when a selection is active
    keyMap:                   "vim",          // use vim key bindings
    gutters: [                                // gutters to use:
      "CodeMirror-linenumbers",               //   line numbers
      "CodeMirror-foldgutter" ],              //   folding
    extraKeys: {                              // custom key bindings
      "Ctrl-Q": function(cm){                 //   Ctrl-Q: toggle fold
        cm.foldCode(cm.getCursor()); },       //
      "Enter":                                //   Enter: hook into markdown list continuation plugin
        "newlineAndIndentContinueMarkdownList"//
    }
  });

  // adapted from markdown fold script
  CodeMirror.registerHelper("fold", "gfm-expanded", function(cm, start) {
    var maxDepth = 100;

    function isHeader(lineNo) {
      var tokentype = cm.getTokenTypeAt(CodeMirror.Pos(lineNo, 0));
      return tokentype && /\bheader\b/.test(tokentype);
    }

    function headerLevel(lineNo, line, nextLine) {
      var match = line && line.match(/^#+/);
      if (match && isHeader(lineNo)) return match[0].length;
      match = nextLine && nextLine.match(/^[=\-]+\s*$/);
      if (match && isHeader(lineNo + 1)) return nextLine[0] == "=" ? 1 : 2;
      return maxDepth;
    }

    var firstLine = cm.getLine(start.line), nextLine = cm.getLine(start.line + 1);
    var level = headerLevel(start.line, firstLine, nextLine);
    if (level === maxDepth) return undefined;

    var lastLineNo = cm.lastLine();
    var end = start.line, nextNextLine = cm.getLine(end + 2);
    while (end < lastLineNo) {
      if (headerLevel(end + 1, nextLine, nextNextLine) <= level) break;
      ++end;
      nextLine = nextNextLine;
      nextNextLine = cm.getLine(end + 2);
    }

    return {
      from: CodeMirror.Pos(start.line, firstLine.length),
      to: CodeMirror.Pos(end, cm.getLine(end).length)
    };
  });

  // render starter text and re-render on text change
  render();
  cm.on('change', _.debounce(render, 300, {maxWait:1000})); // render when typing stops

  // function to scroll preview window to editor location
  scrollSync = _.debounce(
    function(){ scrollTo(visibleLines().top); },
    100,
    {maxWait:100}
  );

  // function to scroll editor window to preview location
  scrollSyncRev = _.debounce(
    function(){ scrollFrom($(this).scrollTop()); },
    100,
    {maxWait:100}
  );

  // bind scroll callbacks to scroll events
  cm.on('scroll', scrollSync);
  $('#viewer-container').on('scroll', scrollSyncRev);
}

// closure containing evernote connection code
function connectToEvernote() {

  ///// APPLICATION STATE VARIABLES AND CONFIGURATION /////

  // GUID for current note
  var currentNote = undefined;

  // cached version diff data
  var diffCache = {}

  // options to pass to diff function
  function diffOptions(title, d) {
    return {
      title       : title,
      diffData    : d,
      $container  : $historyWindow,
      validate    : true,
      style       : 'adjacent'
    }
  }


  ///// GUI ELEMENT REFERENCES /////

  $mainMenu        = $('body > header#main-menu');
  $loadMenuItem    = $('body > header#main-menu a#showNoteList');
  $saveNote        = $('body > header#main-menu a#saveNote');
  $saveNoteAs      = $('body > header#main-menu a#saveNoteAs');
  $newNote         = $('body > header#main-menu a#newNote');
  $previewChanges  = $('body > header#main-menu a#previewChanges');
  $refresh         = $('body > header#main-menu a#refreshConnection');
  $updateToken     = $('body > header#main-menu a#updateToken');

  $viewEditor      = $('body > header#main-menu a#viewEditor');
  $viewHistory     = $('body > header#main-menu a#viewHistory');

  $editorToggle    = $('body > header#main-menu a#editorToggle')

  $historyMenu     = $('#application-window section#history-list');
  $historyList     = $('#application-window section#history-list ul.list-group');
  $noteMenu        = $('#application-window section#nav-list');
  $noteList        = $('#application-window section#nav-list ul.list-group');
  $editorWindow    = $('#application-window main#content');
  $previewWindow   = $('#application-window section#viewer-container');
  $historyWindow   = $('#application-window section#history-container');

  $promptTemplate  = $('#promptTemplate');
  $promptOverlay   = $('#overlay-background');
  $promptBody      = $('#promptTemplate #modalTitle');
  $promptInput     = $('#promptTemplate .modal-body input');
  $promptOK        = $('#promptTemplate button.btn-primary');
  $alertContainer  = $('#alertContainer');
  $alertTemplate   = $('#alertTemplate');


  ///// DIALOG BOXES /////

  // create a new notification window
  function createNotification(message) {
    return $alertTemplate
      .clone()
      .appendTo($alertContainer)
      .attr('id','')
      .show()
      .append(message);
  }

  // create a persistent alert window
  function persistentAlert(message) {
    return createNotification(message).addClass('alert-info');
  }

  // create a transient alert window (hide after 5 seconds)
  function transientAlert(message) {
    $el = createNotification(message).addClass('alert-info').delay(5000).slideUp();
    window.setTimeout( function(){$el.remove()}, 6000 ); // clean up element after hiding
    return $el;
  }

  // create a persistent warning window
  function persistentWarning(message) {
    return createNotification(message).addClass('alert-danger');
  }

  // create a transient warning window (hide after 5 seconds)
  function transientWarning(message) {
    $el = createNotification(message).addClass('alert-danger').delay(5000).slideUp();
    window.setTimeout( function(){$el.remove()}, 6000 ); // clean up element after hiding
    return $el;
  }

  // prompt user for input
  function promptForInput(message, default_entry, callback) {
    $promptTemplate.add($promptOverlay).show();
    $promptBody.text(message);
    $promptInput.val(default_entry);
    $promptOK.one('click', function(){
      $promptTemplate.add($promptOverlay).hide();
      if (callback) callback( $promptInput.val() );
    });
  }


  ///// GUI HANDLERS /////

  function showEditorWindow() {
    $viewHistory.removeClass('btn-primary');
    $viewEditor.addClass('btn-primary');
    $historyMenu.add($historyWindow).hide();
    $editorWindow.add($previewWindow).show();
  }

  function showHistoryWindow() {
    $viewEditor.removeClass('btn-primary');
    $viewHistory.addClass('btn-primary');
    $historyMenu.add($historyWindow).show();
    $editorWindow.add($previewWindow).hide();
  }

  $viewHistory.on('click', function(){
    if ($(this).hasClass('btn-primary') == false) {
      showHistoryWindow();
      showNoteHistory();
    }
  });
  $viewEditor.on('click', function(){
    if ($(this).hasClass('btn-primary') == false) {
      showEditorWindow();
    }
  });

  $editorToggle.on('click', function(){
    $editorToggle.find('span').toggle();
    $('main#content').toggle();
    $('section#viewer-container').toggleClass('col-md-6').toggleClass('col-md-10');
    $('section#floating-toc-container').toggle();
  })


  ///// SERVER CONNECTIVITY /////

  // prompt user to update developer token
  function updateToken() {
    promptForInput(
      'Please enter your Evernote developer token',
      localStorage.getItem('token'),
      function(result) {
        localStorage.setItem('token', result);
      }
    );
  }

  // alias to WrappedNote class
  var WN = EvernoteConnection.WrappedNote;

  // function to use server connection
  function getConnection(callback) {
    if (!WN.hasConnection()) {
      if (localStorage.getItem('token') === null)
        updateToken();
      var $el = persistentAlert('Connecting to Evernote...');
      var opt = {
        searchTags    : ['markdown'],
        saveTags      : ['markdown'],
        errorLogger   : persistentWarning,
        messageLogger : transientAlert
      }
      WN.connect(localStorage.getItem('token'), opt, function() {
        if (!WN.hasConnection()) {
          persistentWarning("Failed to connect to Evernote!");
          throw new Error("Unable to connect to Evernote");
        } else {
          $el.remove();
          transientAlert("Connected to Evernote!");
          populateNoteList(WN.getNoteData());
          if (callback) callback(WN);
        }
      })
    } else {
      if (callback) callback(WN);
    }
  }


  ///// UPDATE DEVELOPER TOKEN /////

  $updateToken.on('click', updateToken);


  ///// REFRESH SERVER CONNECTION /////

  $refresh.on('click', function(){
    getConnection(function(conn) {
      WN.refreshConnection(function(){
        transientAlert("Refreshed Evernote data");
        populateNoteList(WN.getNoteData());
      })
    })
  })


  ///// PREVIEW NOTE CHANGES /////

  $previewChanges.on('click', function(){
    if (currentNote === undefined) {
      transientAlert("No note currently loaded!")
    } else {
      getConnection(function(conn) {
        var note = conn.getNote(currentNote);
        note.fetchContent(function(oldContent) {
          showHistoryWindow();
          $historyWindow.empty();
          $historyMenu.hide();
          compareBlocks(oldContent, cm.getValue(), diffOptions(note.title()));
        })
      })
    }
  })


  ///// UPDATE A NOTE /////

  $saveNote.on('click', function(){
    if (currentNote === undefined) {
      transientAlert("No note currently loaded!")
    } else {
      getConnection(function(conn) {
        var note = conn.getNote(currentNote);
        note.update(cm.getValue(), function() {
          transientAlert("Note "+currentNote+" updated: "+note.title());
          $historyMenu.data('stale', true);
        })
      });
    }
  });


  ///// SAVE A NEW NOTE /////

  $saveNoteAs.on('click', function(){
    promptForInput('New note name', 'Untitled', function(noteTitle) {
      if (noteTitle !== null) {
        getConnection(function(conn) {
          conn.newNote(noteTitle, cm.getValue(), function(note) {
            $historyMenu.data('stale', true);
            currentNote = note.guid;
            populateNoteList(conn.getNoteData());
          })
        });
      }
    })
  });


  ///// CREATE A NEW NOTE /////

  $newNote.on('click', function(){
    currentNote = undefined;
    $historyMenu.data('stale', true);
    cm.setValue('');
  })


  ///// NOTE DATA LOADING /////

  // connect to evernote and populate the list of notes
  function populateNoteList(notes) {
    var notebooks = _.chain(notes).pluck('notebook').unique().sortBy(function(x){return x.toLowerCase()}).value();
    var groupedNotes = _.groupBy(notes, 'notebook');

    // clear click handler and reset note list
    $noteList.off('click').empty();

    // re-build note list
    _.each(notebooks, function(notebook){
      $noteList.append('<li class="list-group-item active">' + notebook + '</li>');
      var notes = _.sortBy(groupedNotes[notebook], function(n){return n.title.toLowerCase()});
      _.each(notes, function(note) {
        $noteList.append('<a href="#" class="list-group-item" data-guid="'+note.guid+'">' + note.title + '</a>');
      });
    });

    // bind a handler for clicking on a note in the list (load the note)
    $noteList.on('click', 'a', function(){
      var guid = $(this).data('guid');

      // indicate currently selected item
      $noteList.find('a.list-group-item.selected').removeClass('selected');
      $(this).addClass('selected');

      // fetch note content
      getConnection(function(conn){
        conn.getNote(guid).fetchContent(function(content){

          // put note content in editor
          cm.setValue(content);

          // if note has changed, flag note history list as stale and update its attached note guid
          if (currentNote !== guid) {
            $historyMenu.data('stale', true);
          }

          // update GUID of current note
          currentNote = guid;
        })
      })

      // hide the note menu
      toggleDropdown();
    });
  }

  // show or hide note menu
  function toggleDropdown() {
    $noteMenu.toggle().addClass('col-md-2');
    $previewWindow.add($editorWindow).toggleClass('col-md-6').toggleClass('col-md-5');
    getConnection();
  }

  // bind 'Load' menu item to show/hide note menu
  $loadMenuItem.on('click', toggleDropdown);


  ///// NOTE HISTORY /////

  function showNoteHistory(){

    // nothing to do if no note is loaded
    if (currentNote === undefined) {
      persistentWarning("A note must be loaded first!");
      return
    }

    // helper function to create a history menu item
    function historyItem(version, date) {
      return '<a href="#" class="list-group-item" data-sequence="'+version+'">' + EvernoteConnection.dateString(date) + '</a>'
    }

    // helper function to return true if all diff data are available
    function diffReady() {
      var selectedItems = $historyList.find('a.active').map( function(){return $(this).data('sequence')} ).toArray();
      if (selectedItems.length < 2) {
        return true
      } else {
        for (var i = 0; i < selectedItems.length-1; i++) {
          if (!(
              diffCache[selectedItems[i+1]] &&
              diffCache[selectedItems[i+1]][selectedItems[i]]
          )) {
            return false
          }
        }
        return true
      }
    }

    // helper function to perform the rendering
    // rendering only happens once all data are available in case the function is backlogged with clicks
    function doRendering() {
      if (diffReady()) {

        // get selected item list
        var $el = $historyList.find('a.active');
        var selectedItems = $el.map( function(){return $(this).data('sequence')} ).toArray();

        // clear history window
        $historyWindow.empty();

        // if only one version is selected, display the content of this version
        if (selectedItems.length == 1) {
          $historyWindow
            .append('<h2>' + $($el[0]).text() + '</h2>')
            .append('<div class="text-diff">' + escapeText(diffCache[selectedItems[0]][null]) + '</div>')

        // otherwise show diffs between selected versions
        } else {
          for (var i = selectedItems.length-2; i >= 0; i--) {
            compareBlocks(
              diffCache[ selectedItems[i+1] ][ null ],
              diffCache[ selectedItems[i]   ][ null ],
              diffOptions(
                $($el[i+1]).text() + ' &rarr; ' + $($el[i]).text(),
                diffCache[ selectedItems[i+1] ][ selectedItems[i] ]
              )
            );
          }
        }
      }
    }

    // callback function for clicking on a history menu item
    function clickHandler() {
      $el = $(this);

      // toggle selection status of current item and get selected item list
      $(this).toggleClass('active');
      var $el = $historyList.find('a.active');
      var selectedItems = $el.map( function(){return $(this).data('sequence')} ).toArray();

      // clear history window
      $historyWindow.empty();

      // call function to fetch note history list
      getConnection(function(conn) {
        conn.getNote(currentNote).fetchContent(selectedItems, function(contentArr) {

          // cache version data
          for (var i = 0; i < contentArr.length; i++) {
            if (!diffCache[selectedItems[i]])
              diffCache[selectedItems[i]] = {null : contentArr[i]};
          }

          // compute diffs between versions
          for (var i = contentArr.length-2; i >= 0; i--) {
            var oldVersion = selectedItems[i+1];
            var newVersion = selectedItems[i];
            var oldContent = contentArr[i+1];
            var newContent = contentArr[i];
            if(! diffCache[oldVersion][newVersion] ) {
              diffCache[oldVersion][newVersion] = compareBlocks(oldContent, newContent, {
                $container : null
              });
            }
          }

          // render results
          doRendering();
        })
      })
    }

    // if history is flagged as out-of-date, regenerate menu
    if ($historyMenu.data('stale')) {
      getConnection(function(conn) {

        // clear cache
        diffCache = {};

        // fetch version list for current note
        var note = conn.getNote(currentNote);
        note.versions(function(versionData) {

          // append menu entry for current version
          $historyList.empty().append(historyItem(note.version(), note.updated()));

          // append menu entries for older versions
          // NOTE: this should be returning wrapped Notes
          for (var i = 0; i < versionData.length; i++) {
            $historyList.append(historyItem(versionData[i].version(), versionData[i].updated()));
          }

          // history menu is no longer out-of-date
          $historyMenu.data('stale', false);

          // bind to click on history menu items
          $historyMenu.find('a').on('click', clickHandler);
        })
      })
    }
  }

}

// set everything in motion once document is ready
$(function(){

  // starter text for editor
  $('textarea#editor').text(md_test + gfm_test);
  launchCodeMirror();
  // $.ajax('Inbox/Linear%20Algebra.md').success(function(x){
  //   $('textarea#editor').text(x);
  //   launchCodeMirror();
  // })

  // start evernote connection
  connectToEvernote();
});
