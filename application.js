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

//////////////////////////
// DEFINE REGEX GRAMMAR //
//////////////////////////

var regex = function(){

  ///////////////////////////////
  // REGEX PROCESSING FUNCTION //
  ///////////////////////////////

  // initialize a regex container with a function to merge a list of regexes
  // or strings into a single regex including token substituation
  var regex = {
    Combine: function(){

      // subfunction: chop off leading ^ if there is one.
      // ignore list head if an index is passed.
      var trimAnchor = function(r,i) {
        if (r[0] == '^' && i != 0) {
          return r.slice(1);
        } else {
          return r;
        }
      }

      // is a set of replacements specified in the last argument?
      var lastArg = _.last(arguments);
      var hasReplacements = _.isObject(lastArg) && !(lastArg instanceof RegExp);

      // collection of regexes to combine (excluding replacements)
      var args = hasReplacements ? _.dropRight(arguments) : arguments;

      // combine inputs into a single regex
      var out = new RegExp(
        _.map(args, function(x,i) {
          return x.source || x
        }).join('')
      );

      // replace tokens in the assembled regex using the lookup map
      if (hasReplacements) {
        out = out.source;
        _.each(_.last(arguments), function(v,k){
          out = out.replace(new RegExp(k,'g'), trimAnchor(v.source||v));
        });
        out = new RegExp(out);
      }

      // return the assembled regex
      return out;
    }
  }

  ///////////////////////////
  // BLOCK GRAMMAR REGEXES //
  ///////////////////////////


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

  // regex for the entire list
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
    BULLET: /(?:[*+-]|\d+\.)/,  // non-captured *, +, -, or xx.
    DEF: regex.def,             // def
    HR: regex.Combine(
        /\1?/,                  // match previously captured indentation
        /(?:[-*_] *){3,}/,      // 3 or more non-captured -, *, or _ w/ optional padding
        /(?:\n+|$)/             // non-captured newlines or end of line
    )
  });

  // regex to capture all the individual list items in a captured list
  // g: global match
  // m: match ^ and $ using individual lines instead of entire string
  regex.item = regex.Combine(
    /^( *)/,            // captured indentation level anchored at start of line
    /(BULLET) /,        // captured bullet and a space
    /[^\n]*/,           // everything up to the newline
    '(?:',              // followed by zero or more (non-captured)...
      /\n/,             //   newline
      /(?!\1BULLET )/,  //   not followed by a bullet with the captured indentation level
      /[^\n]*/,         //   everything up to the newline
    ')*'                // end group
  ,{ // Substitution definitions below
    BULLET: /(?:[*+-]|\d+\.)/, // non-captured *, +, -, or xx.
  });


  ////////// BLOCKQUOTE REGEX //////////

  regex.blockquote = regex.Combine(
    '^(',           // capture one or more ...
      / *>/,        //   whitespace followed by >
      /[^\n]+/,     //   one or more non-newline characters
      '(',          //   captured zero or more ...
        /\n/,       //     newline
        /(?!DEF)/,  //     not followed by a definition
        /[^\n]+/,   //     one or more non-newline characters
      ')*',         //   end capture
      /\n*/,        //   zero or more newlines
    ')+',           // end capture
  { // substitution definitions below
    DEF: regex.def
  });


  ////////// HTML REGEX //////////

  // regex for an html tag
  var regex_tag = regex.Combine(
    '(?!',            // negative lookahead for ...
      '(?:',          //   non-captured (list of tag alternatives) ...
        'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup',
        '|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img',
      ')',            //   end list of tag alteratives
      /\b/,           //   word boundary
    ')',              // end negative lookahead
    /\w+/,            // one more more word character
    '(?!',            // negative lookahead for ...
        /:\//,        //     :/
      /|/,            //   OR
        /[^\w\s@]*/,  //     zero or more non-word, non-whitespace, non-@ characters
        /@/,          //     @
    ')',              // end lookahead
    /\b/              // word boundary
  )

  regex.html = regex.Combine(
    /^ */,                  // leading whitespace
    '(?:',                  // followed by one of (non-captured) ...
        /COMMENT */,        //     HTML comment w/ optional whitespace
        /(?:\n|\s*$)/,      //     non-captured newline or whitespace to end of string
      /|/,                  //   OR
        /CLOSED */,         //     HTML tag pair
        /(?:\n{2,}|\s*$)/,  //     non-captured 2+ newlines or whitespace to end of string
      /|/,                  //   OR
        /CLOSING */,        //     HTML closing tag
        /(?:\n{2,}|\s*$)/,  //     non-captured 2+ newlines or whitespace to end of string
    ')',                    // end of grouping tag
  { // substitutions
    COMMENT: regex.Combine(
      /<!--/,               // opening <!--
      /[\s\S]*?/,           // minimal multi-line match
      /-->/                 // closing -->
    ), CLOSED:  regex.Combine(
      /</,                  // opening <
      '(',regex_tag,')',    // captured html tag name (TAG)
      /[\s\S]+?/,           // minimal multi-line match
      /<\/\1>/              // </TAG>
    ), CLOSING: regex.Combine(
      /</,                  // opening <
      regex_tag,            // html tag name
      '(?:',                // followed by zero or more (non-captured) ...
          /"[^"]*"/,        //     double-quoted text "..."
        /|/,                //   OR
          /'[^']*'/,        //     single-quoted text '...'
        /|/,                //   OR
          /[^'">]/,         //     non-quote characters
      ')*?',                // end grouping
      />/                   // closing >
    )
  });

  ////////// HR REGEX //////////

  regex.hr = regex.Combine(
    /^/,        // anchor on start of string
    '(',        // capture 3 or more ...
      / */,     //   optional spaces
      /[-*_]/,  //   -, *, or _
    '){3,}',    // end capture
    / */,       // optional spaces
    /(?:\n+|$)/ // non-captured newlines or end of line
  );


  ////////// HEADING REGEX //////////

  regex.heading = regex.Combine(
    /^/,          // anchor on start of string
    / */,         // optional spaces
    /(#{1,6})/,   // capture from 1-6 # characters
    / +/,         // one or more space
    /([^\n]+?)/,  // capture as few non-newlines as possible
    / */,         // zero or more spaces
    /#*/,         // zero or more # characters
    / */,         // zero or more spaces
    /(?:\n+|$)/   // non-captured newlines or end of line
  );


  ////////// LHEADING REGEX //////////

  regex.lheading = regex.Combine(
    /^/,          // anchor on start of string
    /([^\n]+)/,   // capture as few non-newlines as possible
    /\n/,         // newline
    / */,         // zero or more spaces
    /(=|-){2,}/,  // 2 or more = or - characters
    / */,         // zero or more spaces
    /(?:\n+|$)/   // non-captured newlines or end of line
  );


  ////////// FENCED CODE REGEX //////////

  regex.fences = regex.Combine(
    /^ */,            // optional leading whitespace
    /(`{3,}|~{3,})/,  // capture 3+ ` or ~ characters
    /[ \.]*/,         // zero or more space or . characters
    /(\S+)?/,         // capture optional sequence of non-whitespace characters
    / *\n/,           // optional whitespace followed by a newline
    /([\s\S]+?)/,     // minimal multi-line capture
    /\s*/,            // optional whitespace
    /\1/,             // match captured opening fences
    / */,             // optional whitespace
    /(?:\n+|$)/       // non-captured newlines or end of line
  );


  ////////// PARAGRAPH REGEX //////////

  // define paragraph regex
  regex.paragraph = regex.Combine(
    /^/,                  // anchor to start of string
    '(',                  // capture ...
      '(?:',              //   one or more (non-captured) ...
        /[^\n]+/,         //     one or more non-newline characters
        /\n?/,            //     optional newline
        '(?!',            //     not followed by (negative lookahead) ...
          /FENCE/,        //       a fence block
          /|LIST/,        //       or a list block
          /|HR/,          //       or a horizontal rule
          /|HEADING/,     //       or a heading
          /|LHEAD/,       //       or an l-heading
          /|BLOCKQUOTE/,  //       or a blockquote
          /|TAG/,         //       or a tag
          /|DEF/,         //       or a definition
        ')',              //     end negative lookahead
      ')+',               //   end non-capturing group
    ')',                  // end capture
    /\n*/,                // zero or more newlines
  {
    FENCE:      regex.Combine(regex.fences,{'\\\\1':'\\2'}), // remap /1 -> /2
    LIST:       regex.Combine(regex.list,  {'\\\\1':'\\3'}), // remap /1 -> /3
    HR:         regex.hr,
    HEADING:    regex.heading.source.replace(' +', ' *'), // use non-gfm heading -- WHY??
    LHEAD:      regex.lheading,
    BLOCKQUOTE: regex.blockquote,
    TAG:        regex.Combine('<',regex_tag), // <TAG
    DEF:        regex.def
  });


  ////////// BULLET REGEX //////////

  regex.bullet = regex.Combine(
    '(?:',        // non-captured ...
        /[*+-]/,  //     *, +, or -
      /|/,        //   OR
        /\d+\./,  //     xxx.
    ')'           // end grouping
  );


  ////////// BLOCK CODE REGEX //////////

  regex.b_code = regex.Combine(
    /^/,        // anchor to start of string
    '(',        // capture one or more ...
      / {4}/,   //   4 spaces
      /[^\n]+/, //   one or more non-newlines
      /\n*/,    //   zero or more newlines
    ')+'        // end capture
  );


  ////////// BLOCK LATEX REGEX //////////

  regex.b_latex = regex.Combine(
    /^/,          // anchor to start of string
    / */,         // optional spaces
    /\$\$/,       // $$
      /\s*/,      //   optional whitespace
      /([^]+?)/,  //   captured minimal multi-line regex
      /\s*/,      //   optional whitespace
    /\$\$/        // $$
  );


  ////////// NEWLINE REGEX //////////

  regex.newline = /^\n+/; // one or more newlines anchored at start of string


  ////////// TABLE REGEXES //////////

  // nptable (table without pipes bracketing rows)
  regex.nptable = regex.Combine(
    /^ */,          // optional leading spaces anchored to start of string
    '(',            // capture header row ...
      /\S/,         //   non-whitespace
      /.*/,         //   zero or more wildcard characters
      /\|/,         //   |
      /.*/,         //   zero or more wildcard characters
    ')',            // end capture
    /\n */,         // newline and zero or more spaces
    '(',            // capture separator row ...
      /[-:]+/,      //   one or more - or : characters
      / */,         //   optional spaces
      /\|/,         //   |
      /[-| :]*/,    //   zero or more -, |, :, or space characters
    ')',            // end capture
    /\n/,           // newline
    '(',            // capture body of table ...
      '(?:',        //   zero or more (non-captured) ...
        /.*/,       //     zero or more wildcard characters
        /\|/,       //     |
        /.*/,       //     zero or more wildcard characters
        /(?:\n|$)/, //     newline or end of string
      ')*',         //   end non-capturing group
    ')',            // end capture
    /\n*/           // zero or more newlines
  );

  // table (table with pipes bracketing rows)
  regex.table = regex.Combine(
    /^ */,            // optional leading spaces anchored to start of string
    /\|/,             // |
    /(.+)/,           // capture one or more wildcard characters (header row)
    /\n/,             // newline
    / */,             // zero or more spaces
    /\|/,             // |
    '(',              // capture separator row ...
      / */,           //   zero or more spaces
      /[-:]+/,        //   one or more - or : characters
      /[-| :]*/,      //   zero or more -, |, :, or space characters
    ')',              // end capture
    /\n/,             // newline
    '(',              // capture body of table ...
      '(?:',          //   zero or more (non-captured) ...
        / */,         //     zero or more spaces
        /\|/,         //     |
        /.*/,         //     zero or more wildcard characters
        /(?:\n|$)/,   //     newline or end of string
      ')*',           //   end non-capturing group
    ')',              // end capture
    /\n*/             // zero or more newlines
  );


  ////////// BLOCK TEXT REGEX //////////

  regex.b_text = /^[^\n]+/; // one or more non-newlines anchored at start of string


  ////////////////////////////
  // INLINE GRAMMAR REGEXES //
  ////////////////////////////


  ////////// INLINE HYPERLINK REGEXES //////////

  // regex for content inside square brackets
  var regex_inside = regex.Combine(
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
  );

  // regex for a hyperlink
  regex.link = regex.Combine(
    /^!?/,         // optional !
    /\[INSIDE\]/,  // link text in square brackets
    /\(HREF\)/,    // link hyperlink in parentheses
  {
    INSIDE: regex_inside,
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
  });

  // reflink regex (what is this??)
  regex.reflink = regex.Combine(
    /^!?/,        // optional leading !
    /\[INSIDE\]/, // link text in square brackets
    /\s*/,        // optional whitespace
    /\[/,         // opening [
      /([^\]]*)/, //   capture zero or more non-] characters
    /\]/,         // closing ]
  { // replacement definition
    INSIDE: regex_inside
  });

  // nolink regex (what is this??)
  regex.nolink = regex.Combine(
    /^!?/,        // optional leading !
    /\[INSIDE\]/, // link text in square brackets
  { // replace with modified regex_inside
    INSIDE: regex_inside.source
      .split('|')     // split on |
      .slice(0,2)     // take first 2 alternatives
      .join('|')      // undo split
      .concat(')*)')  // close out regex_inside
  });


  ////////// BOLD REGEX //////////

  regex.strong = regex.Combine(
      /^__/,        //   __ anchored at start of line
      /([\s\S]+?)/, //   minimal multi-line wildcard
      /__/,         //   __
      /(?!_)/,      //   not followed by another _
    /|/,            // OR
      /^\*\*/,      //   ** anchored at start of line
      /([\s\S]+?)/, //   minimal multi-line wildcard
      /\*\*/,       //   **
      /(?!\*)/      //   not followed by another *
  )


  ////////// ITALICS REGEX //////////

  regex.em = regex.Combine(
    /^UNDERSCORE|^ASTERISK/, // match anchored underscore or asterisk pattern
  {
    UNDERSCORE: regex.Combine(
      /\b_/,            // word boundary followed by _
      '(',              // captured text
        '(?:',          //   one or more (minimal) ...
            /__/,       //       __ (double underscore)
          /|/,          //     OR
            /[\s\S]/,   //       minimal multi-line wildcard
        ')+?',          //   end grouping
      ')',              // end captured text
      /_\b/             // _ followed by word bounary
    ),
    ASTERISK: regex.Combine(
      /\*/,             // *
      '(',              // captured text
        '(?:',          //   one or more (minimal) ...
            /\*\*/,     //       **
          /|/,          //     OR
            /[\s\S]/,   //       minimal multi-line wildcard`
        ')+?',          //   end grouping
      ')',              // end captured text
      /\*/,             // *
      /(?!\*)/          // not followed by another *
    )
  })

  ////////// STRIKETHROUGH REGEX //////////

  regex.del = regex.Combine(
    /^~~/,        // opening ~~
    /(?=\S)/,     // followed by non-whitespace (lookahead)
    '(',          // capture ...
      /[\s\S]*?/, //   minimal multi-line wildcard
      /\S/,       //   followed by non-whitespace
    ')',          // end capture
    /~~/          // closing ~~
  );

  ////////// AUTOLINK REGEX //////////

  regex.autolink = regex.Combine(
    /^</,         // < (anchored to start of string)
    '(',          // capture ...
      /[^ >]+/,   //   one or more characters that aren't a space or >
      /(@|:\/)/,  //   captured @ or :/
      /[^ >]+/,   //   one or more characters that aren't a space or >
    ')',          // end capture
    />/           // >
  );


  ////////// BREAK REGEX //////////

  regex.br = regex.Combine(
    /^/,        // anchor to start of string
    / {2,}/,    // 2 or more spaces
    /\n/,       // newline
    /(?!\s*$)/  // not followed by whitespace to the end of the string
  );


  ////////// INLINE CODE REGEX //////////

  regex.i_code = regex.Combine(
    /^/,          // anchor to start of string
    /(`+)/,       // capture one or more backticks
    /\s*/,        // optional whitespace
    '(',          // capture ...
      /[\s\S]*?/, //   minimal multi-line wildcard
      /[^`]/,     //   non-backtick character
    ')',          // end capture
    /\s*/,        // optional whitespace
    /\1/,         // captured backticks
    /(?!`)/       // not followed by another backtick
  );


  ////////// ESCAPED CHARACTER REGEX //////////

  regex.escape = regex.Combine(
    /^/,                          // anchor to start of string
    /\\/,                         // \
    '(',                          // capture ...
      /[\\`*{}\[\]()#+\-.!_>~|]/, //   one of: \`*{}[]()#+-.!_>~|
    ')'                           // end capture
  );


  ////////// INLINE LATEX REGEX //////////

  regex.i_latex = regex.Combine(
    /^/,          // anchor to start of string
    /\\\\\(/,     // \\(
      /\s*/,      //   optional whitespace
      /([^]+?)/,  //   minimal multi-line wildcard
      /\s*/,      //   optional whitespace
    /\\\\\)/      // \\)
  );


  ////////// TAG REGEX //////////

  regex.tag = regex.Combine(
      /^/,            //   anchor to start of string
      /<!--/,         //   <!--
        /[\s\S]*?/,   //     minimal multi-line wildcard
      /-->/,          //   -->
    /|/,              // OR
      /^/,            //   anchor to start of string
      /</,            //   <
      /\/?/,          //   optional /
      /\w+/,          //   one or more word characters
      '(?:',          //   zero or more minimal non-captured ...
          /"[^"]*"/,  //       "..."
        /|/,          //     OR
          /'[^']*'/,  //       '...'
        /|/,          //     OR
          /[^'">]/,   //       character other than ', ", or >
      ')*?',          //   end non-capturing group
      />/             //   >
  );


  ////////// INLINE TEXT REGEX //////////

  regex.i_text = regex.Combine(
    /^/,                // anchor to start of string
    /[\s\S]+?/,         // minimal multi-line wildcard
    '(?=',              // followed by (positive lookahead) ...
        /[\\<!\[_*`~]/, //     one of \<![_*`~
      /|/,              //   OR
        /https?:\/\//,  //     http:// or https://
      /|/,              //   OR
        / {2,}\n/,      //     2 or more spaces followed by a newline
      /|/,              //   OR
        /$/,            //     end of string
    ')'                 // end lookahead
  );


  ////////// URL REGEX //////////
  regex.url = regex.Combine(
    /^/,                  // anchor to start of string
    '(',                  // capture ...
      /https?:\/\//,      //    http:// or https://
      /[^\s<]+/,          //    one or more non whitespace characters other than <
      /[^<.,:;"')\]\s]/,  //    something other than whitespace or <.,:;"')]
    ')'                   // end capture
  );


  /////////////////////////////
  // REGEX VALIDATION CHECKS //
  /////////////////////////////

  // block grammar from marked.js 0.3.3 (marked.Lexer.rules.tables)
  var marked_block = {
    blockquote: /^( *>[^\n]+(\n(?! *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))[^\n]+)*\n*)+/,
    bullet: /(?:[*+-]|\d+\.)/,
    code: /^( {4}[^\n]+\n*)+/,
    def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
    fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n+|$)/,
    heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/,
    hr: /^( *[-*_]){3,} *(?:\n+|$)/,
    html: /^ *(?:<!--[\s\S]*?--> *(?:\n|\s*$)|<((?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\b)\w+(?!:\/|[^\w\s@]*@)\b)[\s\S]+?<\/\1> *(?:\n{2,}|\s*$)|<(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\b)\w+(?!:\/|[^\w\s@]*@)\b(?:"[^"]*"|'[^']*'|[^'">])*?> *(?:\n{2,}|\s*$))/,
    item: /^( *)((?:[*+-]|\d+\.)) [^\n]*(?:\n(?!\1(?:[*+-]|\d+\.) )[^\n]*)*/gm,
    latex: /^ *\$\$\s*([^]+?)\s*\$\$/,
    lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
    list: /^( *)((?:[*+-]|\d+\.)) [\s\S]+?(?:\n+(?=\1?(?:[-*_] *){3,}(?:\n+|$))|\n+(?= *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))|\n{2,}(?! )(?!\1(?:[*+-]|\d+\.) )\n*|\s*$)/,
    newline: /^\n+/,
    nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
    paragraph: /^((?:[^\n]+\n?(?! *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]+?)\s*\2 *(?:\n+|$)|( *)((?:[*+-]|\d+\.)) [\s\S]+?(?:\n+(?=\3?(?:[-*_] *){3,}(?:\n+|$))|\n+(?= *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))|\n{2,}(?! )(?!\1(?:[*+-]|\d+\.) )\n*|\s*$)|( *[-*_]){3,} *(?:\n+|$)| *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)|([^\n]+)\n *(=|-){2,} *(?:\n+|$)|( *>[^\n]+(\n(?! *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))[^\n]+)*\n*)+|<(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\b)\w+(?!:\/|[^\w\s@]*@)\b| *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)))+)\n*/,
    table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/,
    text: /^[^\n]+/
  };

  // inline grammar from marked.js 0.3.3 (marked.InlineLexer.rules.gfm)
  var marked_inline = {
    autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
    br: /^ {2,}\n(?!\s*$)/,
    code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
    del: /^~~(?=\S)([\s\S]*?\S)~~/,
    em: /^\b_((?:__|[\s\S])+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
    escape: /^\\([\\`*{}\[\]()#+\-.!_>~|])/,
    latex: /^\\\\\(\s*([^]+?)\s*\\\\\)/,
    link: /^!?\[((?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*)\]\(\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*\)/,
    nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
    reflink: /^!?\[((?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*)\]\s*\[([^\]]*)\]/,
    strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
    tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
    text: /^[\s\S]+?(?=[\\<!\[_*`~]|https?:\/\/| {2,}\n|$)/,
    url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/
  };

  // patch marked.js paragraph grammar
  // AS DEFINED: only first \3 back reference is replaced with \1
  // SHOULD BE: all \3 back references are replaced with \1
  marked_block.paragraph = new RegExp(
    marked_block.paragraph.source.replace(
      regex.list.source.replace(/^\^/,'').replace(/\\1/ , '\\3'),
      regex.list.source.replace(/^\^/,'').replace(/\\1/g, '\\3')
    )
  );

  // return the character where two strings stop matching
  var matchesThrough = function(a,b){
    var len = Math.min(a.length, b.length);
    var i = 0;
    while(a.slice(0,i) == b.slice(0,i) && i <= len) { i += 1; }
    return i - 1;
  }

  // run validation checks
  var doValidate = function(rules, prefix) {
    var result = {pass:[], fail:[], na:[]};
    _.each(rules, function(v,k){
      if (k[0] == '_'){ return; }
      k = regex[prefix+k] ? prefix+k : k;
      if (!regex[k]) {
        result.na.push(["NA: "+k]);
      } else if (regex[k].source == v.source) {
        result.pass.push(["PASS: "+k]);
      } else {
        var a = regex[k].source, b = v.source, idx = matchesThrough(a,b);
        result.fail.push(["FAIL: " + k + "\n" +
          "%c   APP: " + a.slice(0,idx) + "%c" + a.slice(idx) + "\n" +
          "%cMARKED: " + b.slice(0,idx) + "%c" + b.slice(idx),
          'color:black', 'color:red', 'color:black', 'color:red']);
      }
    });
    _.each(_.sortBy(result.pass), function(x){ console.log.apply(console, x) });
    _.each(_.sortBy(result.fail), function(x){ console.log.apply(console, x) });
    _.each(_.sortBy(result.na  ), function(x){ console.log.apply(console, x) });
  }
  console.log("=== Validating block grammar ===");
  doValidate(marked_block, 'b_');
  console.log("=== Validating inline grammar ===");
  doValidate(marked_inline, 'i_');

  ////////// RETURN REGEX GRAMMAR //////////
  return regex;
}();

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
      } else if (matches = stream.match(regex.link)) {
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