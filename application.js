////////////////////////////
// CODEMIRROR SIMPLE MODE //
////////////////////////////

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  CodeMirror.defineSimpleMode = function(name, states) {
    CodeMirror.defineMode(name, function(config) {
      return CodeMirror.simpleMode(config, states);
    });
  };

  CodeMirror.simpleMode = function(config, states) {
    ensureState(states, "start");
    var states_ = {}, meta = states.meta || {}, hasIndentation = false;
    for (var state in states) if (state != meta && states.hasOwnProperty(state)) {
      var list = states_[state] = [], orig = states[state];
      for (var i = 0; i < orig.length; i++) {
        var data = orig[i];
        list.push(new Rule(data, states));
        if (data.indent || data.dedent) hasIndentation = true;
      }
    }
    var mode = {
      startState: function() {
        return {state: "start", pending: null,
                local: null, localState: null,
                indent: hasIndentation ? [] : null};
      },
      copyState: function(state) {
        var s = {state: state.state, pending: state.pending,
                 local: state.local, localState: null,
                 indent: state.indent && state.indent.slice(0)};
        if (state.localState)
          s.localState = CodeMirror.copyState(state.local.mode, state.localState);
        if (state.stack)
          s.stack = state.stack.slice(0);
        for (var pers = state.persistentStates; pers; pers = pers.next)
          s.persistentStates = {mode: pers.mode,
                                spec: pers.spec,
                                state: pers.state == state.localState ? s.localState : CodeMirror.copyState(pers.mode, pers.state),
                                next: s.persistentStates};
        return s;
      },
      token: tokenFunction(states_, config),
      innerMode: function(state) { return state.local && {mode: state.local.mode, state: state.localState}; },
      indent: indentFunction(states_, meta)
    };
    if (meta) for (var prop in meta) if (meta.hasOwnProperty(prop))
      mode[prop] = meta[prop];
    return mode;
  };

  function ensureState(states, name) {
    if (!states.hasOwnProperty(name))
      throw new Error("Undefined state " + name + "in simple mode");
  }

  function toRegex(val, caret) {
    if (!val) return /(?:)/;
    var flags = "";
    if (val instanceof RegExp) {
      if (val.ignoreCase) flags = "i";
      val = val.source;
    } else {
      val = String(val);
    }
    return new RegExp((caret === false ? "" : "^") + "(?:" + val + ")", flags);
  }

  function asToken(val) {
    if (!val) return null;
    if (typeof val == "string") return val.replace(/\./g, " ");
    var result = [];
    for (var i = 0; i < val.length; i++)
      result.push(val[i] && val[i].replace(/\./g, " "));
    return result;
  }

  function Rule(data, states) {
    if (data.next || data.push) ensureState(states, data.next || data.push);
    this.regex = toRegex(data.regex);
    this.token = asToken(data.token);
    this.data = data;
  }

  function tokenFunction(states, config) {
    return function(stream, state) {
      if (state.pending) {
        var pend = state.pending.shift();
        if (state.pending.length == 0) state.pending = null;
        stream.pos += pend.text.length;
        return pend.token;
      }

      if (state.local) {
        if (state.local.end && stream.match(state.local.end)) {
          var tok = state.local.endToken || null;
          state.local = state.localState = null;
          return tok;
        } else {
          var tok = state.local.mode.token(stream, state.localState), m;
          if (state.local.endScan && (m = state.local.endScan.exec(stream.current())))
            stream.pos = stream.start + m.index;
          return tok;
        }
      }

      var curState = states[state.state];
      for (var i = 0; i < curState.length; i++) {
        var rule = curState[i];
        var matches = (!rule.data.sol || stream.sol()) && stream.match(rule.regex);
        if (matches) {
          if (rule.data.next) {
            state.state = rule.data.next;
          } else if (rule.data.push) {
            (state.stack || (state.stack = [])).push(state.state);
            state.state = rule.data.push;
          } else if (rule.data.pop && state.stack && state.stack.length) {
            state.state = state.stack.pop();
          }

          if (rule.data.mode)
            enterLocalMode(config, state, rule.data.mode, rule.token);
          if (rule.data.indent)
            state.indent.push(stream.indentation() + config.indentUnit);
          if (rule.data.dedent)
            state.indent.pop();
          if (matches.length > 2) {
            state.pending = [];
            for (var j = 2; j < matches.length; j++)
              if (matches[j])
                state.pending.push({text: matches[j], token: rule.token[j - 1]});
            stream.backUp(matches[0].length - (matches[1] ? matches[1].length : 0));
            return rule.token[0];
          } else if (rule.token && rule.token.join) {
            return rule.token[0];
          } else {
            return rule.token;
          }
        }
      }
      stream.next();
      return null;
    };
  }

  function cmp(a, b) {
    if (a === b) return true;
    if (!a || typeof a != "object" || !b || typeof b != "object") return false;
    var props = 0;
    for (var prop in a) if (a.hasOwnProperty(prop)) {
      if (!b.hasOwnProperty(prop) || !cmp(a[prop], b[prop])) return false;
      props++;
    }
    for (var prop in b) if (b.hasOwnProperty(prop)) props--;
    return props == 0;
  }

  function enterLocalMode(config, state, spec, token) {
    var pers;
    if (spec.persistent) for (var p = state.persistentStates; p && !pers; p = p.next)
      if (spec.spec ? cmp(spec.spec, p.spec) : spec.mode == p.mode) pers = p;
    var mode = pers ? pers.mode : spec.mode || CodeMirror.getMode(config, spec.spec);
    var lState = pers ? pers.state : CodeMirror.startState(mode);
    if (spec.persistent && !pers)
      state.persistentStates = {mode: mode, spec: spec.spec, state: lState, next: state.persistentStates};

    state.localState = lState;
    state.local = {mode: mode,
                   end: spec.end && toRegex(spec.end),
                   endScan: spec.end && spec.forceEnd !== false && toRegex(spec.end, false),
                   endToken: token && token.join ? token[token.length - 1] : token};
  }

  function indexOf(val, arr) {
    for (var i = 0; i < arr.length; i++) if (arr[i] === val) return true;
  }

  function indentFunction(states, meta) {
    return function(state, textAfter, line) {
      if (state.local && state.local.mode.indent)
        return state.local.mode.indent(state.localState, textAfter, line);
      if (state.indent == null || state.local || meta.dontIndentStates && indexOf(state.state, meta.dontIndentStates) > -1)
        return CodeMirror.Pass;

      var pos = state.indent.length - 1, rules = states[state.state];
      scan: for (;;) {
        for (var i = 0; i < rules.length; i++) {
          var rule = rules[i];
          if (rule.data.dedent && rule.data.dedentIfLineStart !== false) {
            var m = rule.regex.exec(textAfter);
            if (m && m[0]) {
              pos--;
              if (rule.next || rule.push) rules = states[rule.next || rule.push];
              textAfter = textAfter.slice(m[0].length);
              continue scan;
            }
          }
        }
        break;
      }
      return pos < 0 ? 0 : state.indent[pos];
    };
  }
});


///////////////////////////////
// REGEX PROCESSING FUNCTION //
///////////////////////////////

// initialize a regex container with a function to merge a list of regexes
// or strings into a single regex including token substituation
var regex = {
  Combine: function(){

    // is a set of replacements specified in the last argument?
    var lastArg = _.last(arguments);
    var hasReplacements = _.isObject(lastArg) && !(lastArg instanceof RegExp);

    // collection of regexes to combine (excluding replacements)
    var args = hasReplacements ? _.dropRight(arguments) : arguments;

    // combine inputs into a single regex
    var out = new RegExp(
      _.map(args,
        function(x){ return x.source || x }
      ).join('')
    );

    // replace tokens in the assembled regex using the lookup map
    if (hasReplacements) {
      out = out.source;
      _.each(_.last(arguments), function(v,k){
        out = out.replace(new RegExp(k,'g'), v.source||v);
      });
      out = new RegExp(out);
    }

    // return the assembled regex
    return out;
  }
};


////////// HYPERLINK REGEX //////////

regex.link = regex.Combine(
  /^!?/,         // optional !
  /\[INSIDE\]/,  // link text in square brackets
  /\(HREF\)/,    // link hyperlink in parentheses
{
  INSIDE: regex.Combine(
    '((?:',               // capture zero or more ...
        /\[/,             //   [
          /[^\]]*/,       //     ... (not [)
        /\]/,             //   ]
      /|/,                // OR
        /[^\[\]]/,        //   something other than [ or ]
      /|/,                // OR
        /\]/,             //   ]
        /(?=[^\[]*\])/,   //   followed by ... (not [) and [
    ')*)'
  ),
  HREF: regex.Combine(
    /\s*/,            // optional padding whitespace
    /<?/,             // optional <
    /([\s\S]*?)/,     // captured href (minimal wildcard)
    />?/,             // optional >
    '(?:',            // optional non-captured link title ...
      /\s+/,          //     whitespace padding
      /['"]/,         //     opening quote (' or ")
        /([\s\S]*?)/, //       captured text (minimal wildcard)
      /['"]/,         //     closing quote (' or ")
    ')?',             //
    /\s*/             // optional padding whitespace
  )
}
);

////////// DEFINITION REGEX //////////

regex.def = regex.Combine(
  /^ */,            //   leading whitespace
  /\[/,             //   [
    /([^\]]+)/,     //     capture one or more non-] character
  /\]:/,            //   ]:
  / */,             //   trailing whitespace
  /<?/,             //   optional <
    /([^\s>]+)/,    //     capture one or more non-space non-> characters
  />?/,             //   optional >
  '(?:',            //   optional non-capturing group
    / +/,           //     leading whitespace
    /["(]/,         //     " or (
      /([^\n]+)/,   //       capture one or more non-newline characters
    /[")]/,         //     " or )
  ')?',             //   end of non-capturing group
  / */,             //   trailing whitespace
  /(?:\n+|$)/       //   positive lookahead for 1+ newline or end of string
);

////////// LIST REGEX //////////
/*
Regex starts with a bullet (possibly indented) and captures everything including
newlines until one of the following:
  1:  There is a horizontal rule on the next line (non-matching lookahead)
  2:  There is a definition on the next line (non-matching lookahead)
  3a: There are 2+ newlines not followed by a space
  3b: There are 2+ newlines not followed by a bullet with captured indentation
  4:  The string ends
*/

regex.list = regex.Combine(
  /^( *)/,              // capture the bullet indentation level ($1)
  /(BULLET)/,           // capture a bullet ($2)
  / [\s\S]+?/,          // leading space and minimal multi-line wildcard
  '(?:',                // followed by one of (non-captured)...
      /\n+/,            //   newlines
      /(?=HR)/,         //   followed by a horizontal rule (lookahead)
    /|/,                // OR
      /\n+/,            //   newlines
      /(?=DEF)/,        //   followed by a definition (lookahead)
    /|/,                // OR
      /\n{2,}/,         //   2 or more newlines
      /(?! )/,          //   not followed by a space
      /(?!\1BULLET )/,  //   not followed by a bullet with the captured indentation level
      /\n*/,            //   0 or more newlines
    /|/,                // OR
      /\s*$/,           //   trailing whitespace until the end of string
  ')'
,{ // Substitution definitions below
  BULLET: /(?:[*+-]|\d+\.)/, // non-captured *, +, -, or xx.
  DEF: regex.def.source.slice(1), // def w/o leading ^
  HR: regex.Combine(
      /\1?/,              // match previously captured indentation
      /(?:[-*_] *){3,}/,  // 3 or more non-captured -, *, or _ w/ optional padding
      /(?:\n+|$)/         // non-captured newlines or end of line
  )
});


////////// BOLD REGEX //////////

regex.strong = regex.Combine(
    /^__/,
    /([\s\S]+?)/,
    /__/,
    /(?!_)/,
  /|/,
    /^\*\*/,
    /([\s\S]+?)/,
    /\*\*/,
    /(?!\*)/
)

////////// ITALICS REGEX //////////

regex.em = regex.Combine(
  
)


////////// REGEX VALIDATION CHECKS //////////

if(window.marked){
  doValidate = function(rules) {
    var result = {pass:[], fail:[], na:[]};
    _.each(rules, function(v,k){
      if (!regex[k]) {
        result.na.push(k);
      } else if (regex[k].source == v.source) {
        result.pass.push(k);
      } else {
        result.fail.push(k);
      }
    });
    _.each(_.sortBy(result.pass), function(x){ console.log("PASS: "+x) });
    _.each(_.sortBy(result.fail), function(x){ console.log("FAIL: "+x) });
    _.each(_.sortBy(result.na  ), function(x){ console.log("N/A: " +x) });
  }
  console.log("=== Validating block grammar ===");
  doValidate(marked.Lexer.rules.tables);
  console.log("=== Validating inline grammar ===");
  doValidate(marked.InlineLexer.rules.gfm);
}


////////// BASIC REGEXES //////////

var headerRegex = /^\s*#+.*/;
var boldRegex1 = /^__([\s\S]+?)__(?!_)/
var boldRegex2 = /^\*\*([\s\S]+?)\*\*(?!\*)/;


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
CodeMirror.defineSimpleMode("gfm", {
  start: [
    { regex:/!?\[((?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*)\]\(\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*\)/, token:['link','string']},
    { regex:/```/, token: 'comment', next:'code' },
    { regex:/   .+/, token:'comment', sol:true },
    { regex:/`.+`/, token:'comment'},
    { regex:/ *#+.*/, token:'header', sol:true },
    { regex:/ *\*.*/, token:'variable-2', sol:true },
    { regex:/ *\d+\. .*/, token:'variable-2', sol:true },
    { regex:/\*{2}.+?\*{2}/, token:'strong'},
    { regex:/\b_.+?_\b/, token:'em'},
    { regex:/\\\\\(.+?\\\\\)/, token:'error'},
    { regex:/(=|\-)+/, token:'header', sol:true}


    //{ regex:/\b_(?:__|[\s\S])+?_\b/, token:'em' },
    //{ regex:/\b\*\*/, token:'strong', push:'strong' }
  ],
  code: [
    {regex:/.*?```/, token: 'comment', next:'start'},
    {regex:/.*/, token:'comment'}
  ],
  strong: [
    { regex:/.*\*{2}\b}/, token: 'strong', pop:true },
    { regex:/.*/, token:'string'}
  ]
});

// Define a CodeMirror mode for markdown editor
CodeMirror.defineMode('gfm-expanded', function(){

  // mode-scope variables go here

  // list of inline tokens
  var inlineTokens = [
    [ /^\*\*/,      'strong',   /.*?\*\*(?!\*)/ ],
    [ /^\\\\\(\s*/, 'error',    /.*?\s*\\\\\)/     ]
  ];

  // list of block tokens that don't delegate to inline grammar
  var blockTokens = [
    [ /^```/,       'comment',  /.*?```/           ]
  ]

  // list of blck tokens that do delegate to inline grammar
  // (call to this.inline in Parser.prototype.tok)

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
        inline: null,
        queue: []
      };
    },

    // function to copy current state
    copyState: function(state) {
      return {
        inline: state.inline,
        queue: state.queue.slice(0) // copy array
      }
    },

    // function to process a regex match
    processMatch: function(stream, state, matches, css) {
      if (matches.length > 2 || matches[0] != matches[1]) { // regex output doesn't match token exactly
        var str = matches[0];         // full string that matches the regex
        var tok = matches.slice(1);   // captured tokens
        while (str.length > 0) {
          idx = str.indexOf(tok[0]);
          if (idx > 0) {                // non-captured text at start of token
            state.queue.push([ str.slice(0,idx), '' ]);
            str = str.slice(idx);
          } else if (tok.length == 0) { // non-captured text at end of token
            state.queue.push([ str, '' ]);
            str = '';
          } else {                      // token starting at position 0
            var n = (tok[0] || '').length;
            state.queue.push([ tok.shift() || '', css.shift() ]);
            str = str.slice(n);
          }
        }
        stream.backUp(matches[0].length); // reverse match operation
        return this.token(stream, state); // recurse to pop off first token
      } else { // regex output is an exact match, so return css
        return css;
      }
    },

    // main token processing function
    token: function(stream, state) {

      // pop token off queue if non-empty
      if (state.queue.length > 0) {
        var pend = state.queue.shift();
        if (pend[0].length > 0) {
          stream.pos += pend[0].length;
          return pend[1];
        } else {
          return this.token(stream,state);
        }
      }

      // process data if in an inline mode
      if (state.inline != null) {
        if (stream.match(state.inline.term)) { // token ends on this line
          var css = state.inline.css;
          state.inline = null;
          return css;
        } else { // token extends beyond this line
          stream.skipToEnd();
          return state.inline.css;
        }
      }

      // check list of inline tokens for a match
      for (var i = 0; i < inlineTokens.length; i++) {
        var tok = inlineTokens[i];
        if (stream.match(tok[0])) {
          state.inline = {term:tok[2], css:tok[1]};
          return state.inline.css;
        }
      }

      var matches; // placeholder for current match
      if (matches = stream.match(/```/)) {
        state.inlineToken = 'comment';
        state.inlineTerm = /.*?```/;
        return 'comment';
      } else if (matches = stream.match(linkRegex)) {
        return this.processMatch(stream, state, matches, ['link','variable-2','comment']); // link text, link href, link title
      } else if (matches = stream.match(headerRegex)) {
        return this.processMatch(stream, state, matches, 'header');
      } else if (matches = stream.match(/^\*\*/)) {
        state.inlineToken = 'strong';
        state.inlineTerm = /.*?\*\*(?!\*)/;
        return 'strong';
      }

      stream.next();
      return null;

      /*
      if (state.pending) {
        var pend = state.pending.shift();
        if (state.pending.length == 0) state.pending = null;
        stream.pos += pend.text.length;
        return pend.token;
      }

      if (state.local) {
        if (state.local.end && stream.match(state.local.end)) {
          var tok = state.local.endToken || null;
          state.local = state.localState = null;
          return tok;
        } else {
          var tok = state.local.mode.token(stream, state.localState), m;
          if (state.local.endScan && (m = state.local.endScan.exec(stream.current())))
            stream.pos = stream.start + m.index;
          return tok;
        }
      }

      var curState = states[state.state];

      for (var i = 0; i < curState.length; i++) {
        var rule = curState[i];
        var matches = (!rule.data.sol || stream.sol()) && stream.match(rule.regex);
        if (matches) {
          if (rule.data.next) {
            state.state = rule.data.next;
          } else if (rule.data.push) {
            (state.stack || (state.stack = [])).push(state.state);
            state.state = rule.data.push;
          } else if (rule.data.pop && state.stack && state.stack.length) {
            state.state = state.stack.pop();
          }

          if (rule.data.mode)
            enterLocalMode(config, state, rule.data.mode, rule.token);
          if (rule.data.indent)
            state.indent.push(stream.indentation() + config.indentUnit);
          if (rule.data.dedent)
            state.indent.pop();
          if (matches.length > 2) {
            state.pending = [];
            for (var j = 2; j < matches.length; j++)
              if (matches[j])
                state.pending.push({text: matches[j], token: rule.token[j - 1]});
            stream.backUp(matches[0].length - (matches[1] ? matches[1].length : 0));
            return rule.token[0];
          } else if (rule.token && rule.token.join) {
            return rule.token[0];
          } else {
            return rule.token;
          }
        }
      }
      stream.next();
      return null;
      */
    }
  }
})


////////////////////////////
// CACHED LATEX RENDERING //
////////////////////////////

// regex to match latex blocks
var LATEX_REGEX = /(?:\\\\\(([^]*?)\\\\\))|(?:\$\$([^]*?)\$\$)/g;

// hash table of processed latex
var latexMap = {};

// capture previously rendered latex in specified element
captureLatex = function($el) {
  if ($el.find('div.MathJax_Display').length > 0){
    var latex = $el.find('script').first().text().replace(/^\s*(.*?)\s*$/,'$1');
    var html = $el.find('div.MathJax_Display')[0].outerHTML;
    latexMap[latex] = html;
  }
}

// render latex in the specified element
renderLatex = function(el) {
  var latex = $(el).text().replace(LATEX_REGEX, "$1$2").replace(/^\s*(.*?)\s*$/,'$1');
  if (latexMap[latex]) {
    var idx = $.inArray($(el)[0], $('latex'));
    $(el).html( latexMap[latex] ).append(
      '<script type="math/tex; mode=display">' + latex + '</script>'
    );
  } else {
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, el]);
  }
};


////////////////////////
// MARKDOWN RENDERING //
////////////////////////

// has the latex processing script been loaded yet?
var latexLoaded = false;

// function to render markdown into the specified element
renderMarkdown = function(x, $el) {

  // capture latex blocks
  var latex = x.match(LATEX_REGEX);

  // populate specified element with text converted to markdown
  $el.html(marked(x
    .replace(/\r?\n/g,    '\n'         ) // standardize line breaks to /n
    //.replace(LATEX_REGEX, '<latex />'  ) // escape latex
    .replace(/\[TOC\]/gi, '<toc></toc>') // TOC jQuery can find
  ,{lineMarkers:true}));

  // return latex to page
  //$el.find('latex').each(function(){
    //$(this).text(latex.shift());
    /*var tex = latex.shift().replace(/^\\\\\(/, '').replace(/\\\\\)$/, '').replace(/^\$\$/, '').replace(/\$\$$/, '');
    try {
      tex = katex.renderToString(tex);
    } catch(err) {
      console.log("Error processing latex: \n\n" + tex + "\n\n" + err);
    }
    $(this).html(tex);*/
  //});

  // create a table of contents
  var toc = marked(
    $(':header').not('h1').map(function(){
      var level = parseInt($(this).prop("tagName").slice(1));
      return Array(1+2*(level-1)).join(' ') + "* ["+$(this).html()+"](#"+$(this).attr('id')+")";
    }).toArray().join('\n'));

  // fill TOC elements
  $el.find('toc').html(toc);

  // add latex processor if applicable
  if (latex) {
    if (latexLoaded) {
      $el.find('latex').each(function(){ renderLatex(this) });
    } else {
      $.getScript('https://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS_HTML');
      latexLoaded = true;
    }
  }

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

// interpolate data to a linear range
interpolate = function(x_vec, y_vec, xi, xf) {
  var out = [], x1, x2, y1, y2, m;
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

// return editor contents with line markers
contentWithMarkers = function(cm){
  var data = cm.getValue().split("\n");
  for (var i = 0; i < data.length; i++) {
    data[i] += "<codemirror-line" + i + " />"
  }
  var tok = marked.lexer(data.join("\n"));
  var out_tok = [];
  for (var i = 0; i < tok.length; i++) {
    if (tok[i].text != null && tok[i].text.match(/<codemirror-(top|cursor|bottom)\/>/)) {
      console.log(tok[i]);
    }
  }
  debugger
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

  // capture any existing rendered latex
  $('#viewer latex').each(function(){ captureLatex($(this)); });

  // execute rendering
  renderMarkdown(cm.getValue(),$('#viewer'));

  // capture line numbers
  var x = [], y = [];
  var lineRefs = $('span.linemarker').map( function(){
    x.push(parseInt($(this).text()));
    y.push($(this).next().position().top);
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
