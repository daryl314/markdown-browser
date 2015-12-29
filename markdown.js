// placeholder for data
window.markdown = {};

//////////////////////////////
//////////////////////////////
//// DEFINE REGEX GRAMMAR ////
//////////////////////////////
//////////////////////////////

// compile regex grammar and attach results to global object
markdown.regex = function(){

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
  regex.def.tokens = ['link', 'href', 'title'];


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
  regex.list.tokens = ['indent', 'bull'];

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
  regex.item = new RegExp(regex.item.source, 'gm');


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
  regex.html.tokens = ['pre'];


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
  regex.heading.tokens = ['depth', 'text'];


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
  regex.lheading.tokens = ['text', 'depth'];


  ////////// FENCED CODE REGEX //////////

  regex.fences = regex.Combine(
    /^ */,            // optional leading whitespace
    /(`{3,}|~{3,})/,  // capture 3+ ` or ~ characters
    /[ \.]*/,         // zero or more space or . characters
    /(\S+)?/,         // capture optional sequence of non-whitespace characters
    / *\n/,           // optional whitespace followed by a newline
    /([\s\S]*?)/,     // minimal multi-line capture
    /\s*/,            // optional whitespace
    /\1/,             // match captured opening fences
    / */,             // optional whitespace
    /(?:\n+|$)/       // non-captured newlines or end of line
  );
  regex.fences.tokens = ['', 'lang', 'code'];


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
  regex.paragraph.tokens = ['text'];


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
  regex.nptable.tokens = ['header', 'align', 'cells'];

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
  regex.table.tokens = ['header', 'align', 'cells'];


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
    /^!?/,         // optional ! (for an image)
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
  regex.link.tokens = ['text','href','title'];

  // reflink regex (what is this??)
  regex.reflink = regex.Combine(
    /^!?/,        // optional leading ! (for an image)
    /\[INSIDE\]/, // link text in square brackets
    /\s*/,        // optional whitespace
    /\[/,         // opening [
      /([^\]]*)/, //   capture zero or more non-] characters
    /\]/,         // closing ]
  { // replacement definition
    INSIDE: regex_inside
  });
  regex.reflink.tokens = ['text', 'href'];

  // nolink regex (what is this??)
  regex.nolink = regex.Combine(
    /^!?/,        // optional leading ! (for an image)
    /\[INSIDE\]/, // link text in square brackets
  { // replace with modified regex_inside
    INSIDE: regex_inside.source
      .split('|')     // split on |
      .slice(0,2)     // take first 2 alternatives
      .join('|')      // undo split
      .concat(')*)')  // close out regex_inside
  });
  regex.nolink.tokens = ['text', 'href'];


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
  regex.strong.tokens = ['opt1','opt2'];


  ////////// ITALICS REGEX //////////

  regex.em = regex.Combine(
    /^UNDERSCORE|^ASTERISK/, // match anchored underscore or asterisk pattern
  {
    UNDERSCORE: regex.Combine(
      /\b_/,            // word boundary followed by _
      '(',              // captured text
        '(?:',          //   one or more (minimal) ...
            /[^_]/,     //       non-underscore character
          /|/,          //     OR
            /__/,       //       double underscore
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
  });
  regex.em.tokens = ['opt1','opt2'];

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
  regex.del.tokens = ['text'];

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
  regex.autolink.tokens = ['link','symbol'];


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
  regex.i_code.tokens = ['', 'text'];


  ////////// ESCAPED CHARACTER REGEX //////////

  regex.escape = regex.Combine(
    /^/,                          // anchor to start of string
    /\\/,                         // \
    '(',                          // capture ...
      /[\\`*{}\[\]()#+\-.!_>~|]/, //   one of: \`*{}[]()#+-.!_>~|
    ')'                           // end capture
  );
  regex.escape.tokens = ['text'];


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
  regex.url.tokens = ['link'];

  ////////// RETURN REGEX GRAMMAR //////////
  return regex;
}();


/////////////////////////////
/////////////////////////////
//// MARKDOWN CONVERSION ////
/////////////////////////////
/////////////////////////////

// function to try processing a regex rule
markdown.processToken = function(src, rule, stack, line){
  line = line || 0;                         // default line number is 0
  var cap = markdown.regex[rule].exec(src); // try to match rule
  if (cap) {                                // if rule matches...
    var names =
      markdown.regex[rule].tokens || [];    //   default to empty list of token names
    var myTok = {                           //   initialize output token...
      type: rule,                           //     rule name that matched
      cap:  cap[0],                         //     matching text
      n:    cap[0].length                   //     number of characters matched
    };
    for (var i = 0; i < names.length; i++){ //   iterate over named fields...
      if (names[i] != '') {                 //     if a name is defined...
        myTok[names[i]] = cap[i+1];         //       assign captured text to named token
      }
    }
    myTok.sourceLine = line;                //   attach source line number to token
    myTok.lines =                           //   store number of lines processed
      (cap[0].match(/\n/g) || []).length;   //     ...
    stack.push(myTok);                      //   push token to stack
    return myTok;                           //   return a reference to the current token
  } else {                                  // if rule doesn't match...
    return false;                           //   return false
  }
}


//////////////////
// INLINE LEXER //
//////////////////

// return a structure of data related to inline lexing
markdown.inline = function(){

  // create object to handle inline lexing
  inline = {};

  // rule sequence
  inline.rules = [
    'escape', 'autolink', 'url', 'tag', 'link', 'reflink', 'nolink',
    'strong', 'em', 'i_code', 'br', 'del', 'i_text'
  ]

  // rule sequence when in 'inLink' state
  inline.rules_link = _.without(inline.rules, 'url');

  // function to handle lexing by instantiating Inline Lexer
  inline.lex = function(src, inLink){
    var myLexer = new inline.Lexer(src, inLink);
    return myLexer.lex();
  }

  ////////// LEXER CLASS //////////

  // constructor
  inline.Lexer = function(src, inLink){
    this.src    = src;              // remaining text to process
    this.tok    = [];               // list of processed tokens
    this.inLink = inLink || false;  // state flag: inside a hyperlink?
  }

  // processor: consume markdown in source string and convert to tokens
  inline.Lexer.prototype.lex = function(src){
    var cap;
    inline_consumer: while(this.src){
      var rules = this.inLink ? inline.rules_link : inline.rules;
      for (var i = 0; i < rules.length; i++) {
        var r = rules[i];                      // current rule in list
        if (cap = markdown.processToken(this.src, r, this.tok)) {
          if (this[r]) this[r](cap);              // execute handler
          this.src = this.src.substring(cap.n);   // remove captured text
          continue inline_consumer;               // continue consumption
        }
      }

      // throw an error if none of the rules matched
      if (this.src) { // nothing matched and a string remains
        throw new Error('Failed to match a markdown rule: ' + this.src.charCodeAt(0));
      }
    }
    return this.tok;
  }

  // recursively process 'text' field
  inline.Lexer.prototype.recurse = function(tok, txt, inLink){
    tok.text = inline.lex(txt||tok.text, inLink||this.inLink);
  }

  ////////// INLINE TOKEN PROCESSING //////////

  // assign captured text to 'text' field
  inline.Lexer.prototype.i_text = function(x){ x.text = x.cap };
  inline.Lexer.prototype.tag    = function(x){ x.text = x.cap };

  // recursive processing of 'text' field
  inline.Lexer.prototype.strong = function(x){ this.recurse(x, x.opt1 || x.opt2) };
  inline.Lexer.prototype.em     = function(x){ this.recurse(x, x.opt1 || x.opt2) };
  inline.Lexer.prototype.del    = function(x){ this.recurse(x)                   };

  // process an escaped character
  inline.Lexer.prototype.escape = function(x){
    x.type = 'i_html'; // render escaped character as unescaped html
  }

  // process an autolink
  inline.Lexer.prototype.autolink = function(x){
    if (x.symbol === '@') {                       // email address
      var email = x.link.replace(/^mailto:/,'');  //   email address w/o mailto
      x.text = email;                             //   hyperlink text: email
      x.href = 'mailto:' + email;                 //   hyperlink href: mailto:email
      x.type = 'mailto';                          //   render as a mailto link
    } else {                                      // url
      x.text = markdown.render.escape(x.link);    //   hyperlink text: escaped link
      x.href = x.link;                            //   hyperlink href: link
      x.type = 'link';                            //   render as a link
    }
  }

  // process a URL: render as a link
  inline.Lexer.prototype.url = function(x){
    x.text = x.link;
    x.href = x.link;
    x.type = 'link';
  }

  // process a tag: toggle inLink state if this is an opening or closing anchor
  inline.Lexer.prototype.tag = function(x){
    x.text = x.cap;
    if      (  /^<a /i.test(x.cap)) this.inLink = true;
    else if (/^<\/a /i.test(x.cap)) this.inLink = false;
  }

  // process a link
  inline.Lexer.prototype.link = function(x){
    if (/^!/.test(x.cap)) {                       // if captured text starts w/ '!' ...
      x.type = 'image';                           //   then set type to image
    } else {                                      // otherwise ...
      x.type = 'link';                            //   set type to link (if coming from reflink)
      this.recurse(x, x.text, true);              //   recursively process link text
    }
  }

  // process a reference link
  inline.Lexer.prototype.reflink = function(x){
    var linkLookup = (x.href || x.text).replace(/\s+/g, ' ').toLowerCase();
    if (
        !markdown.links[linkLookup]       ||
        !markdown.links[linkLookup].href) { // undefined link
      this.tok.pop();       // rewind token capture
      x.type = 'i_text';    // set token type to inline text ...
      x.text = this.src[0]; //   that is the first character in source
      x.n = 1;              //   that is a single character
      x.cap = x.text;       //   that captured the single character
      this.tok.push(x);     // add new token to stack
    } else {
      x.href  = markdown.links[linkLookup].href;  // get link from lookup
      x.title = markdown.links[linkLookup].title; // get title from lookup
      this.link(x); // call link processor
    }
  }

  // process a no-link as a reference link
  inline.Lexer.prototype.nolink = inline.Lexer.prototype.reflink;

  // return object
  return inline;
}();


/////////////////
// BLOCK LEXER //
/////////////////

// return a structure of data related to block lexing
markdown.block = function(){

  // create an object to handle block lexing
  block = {};

  ////////// HANDLER FUNCTION FOR MARKDOWN TABLES //////////

  function processTable(t) {

    // split up table components
    t.header = t.header.replace(/^ *| *\| *$/g, '').split(/ *\| */);
    t.align = t.align.replace(/^ *|\| *$/g, '').split(/ *\| */);
    t.cells = t.cells.replace(/(?: *\| *)?\n$/, '').split('\n');

    // process column alignment
    for (i = 0; i < t.align.length; i++) {
      if      (/^ *-+: *$/ .test(t.align[i])) { t.align[i] = 'right';  }
      else if (/^ *:-+: *$/.test(t.align[i])) { t.align[i] = 'center'; }
      else if (/^ *:-+ *$/ .test(t.align[i])) { t.align[i] = 'left';   }
      else                                    { t.align[i] = null;     }
    }

    // split rows into individual cells
    for (i = 0; i < t.cells.length; i++) {
      t.cells[i] = t.cells[i]
        .replace(/^ *\| *| *\| *$/g, '')
        .split(/ *\| */);
    }

    // render both table and nptable as a table
    t.type = 'table';
  };


  ////////// HANDLER FUNCTION FOR MARKDOWN BLOCKQUOTES //////////

  // recursively process captured text without leading blockquote markup
  function processBlockQuote(t, tok, state, lineNumber) {
    t.text = block.tokenize(t.cap.replace(/^ *> ?/gm, ''), [],
      { isList:state.isList, isBlockQuote:true }, // set state to inside a blockquote
      lineNumber
    );
    for (var j = 0; j < t.text.length ; j++) {
      t.lines += t.text[j].lines;
    }
  };


  ////////// HANDLER FUNCTION FOR MARKDOWN LISTS //////////

  function processList(t, tok, state, lineNumber) {

    // augment captured list token
    t.text = []; // container for list item tokens
    t.ordered = t.bull.length > 1; // is this an ordered list?
    t.listtype = t.ordered ? 'ol' : 'ul';

    // capture top-level itemns and iterate over them
    var cap = t.cap.match(markdown.regex.item);
    var previousNewline = false;
    for (var i = 0; i < cap.length; i++) {
      var item = cap[i];

      // remove bullet from current item for recursive processing
      var matchLength = item.match(/^ *([*+-]|\d+\.) +/)[0].length;
      item = item.slice(matchLength); // slice off bullet

      // if there are multiple lines in the item, remove leading spaces up to
      // the first row indentation level on other lines
      item = item.replace(new RegExp('^ {1,' + matchLength + '}', 'gm'), '');

      // this is a loose item if the previous item ended in a newline or...
      // item has a double newline not followed by whitespace to the end of it
      var loose = previousNewline ||
        /\n\n(?!\s*$)/.test(item); // double newline not followed by whitespace to end of item

      // if this isn't the last item...
      //   * remember if this item ended in a newline
      //   * this is a loose item if it ends in a newline and isn't already loose
      if (i !== cap.length - 1) {
        previousNewline = /\n$/.test(item);
        if (!loose) loose = previousNewline;
      }

      // recursively process list item
      var myTok = block.tokenize(item, [], {isList:true, isBlockQuote:state.isBlockQuote}, lineNumber);
      for (var j = 0; j < myTok.length ; j++) {
        t.lines += myTok[j].lines;
      }

      // add list item to list
      t.text.push({
        type: 'listitem',
        text: myTok,
        loose: loose
      })
    }
  };


  ////////// BLOCK GRAMMAR RULE SEQUENCES //////////

  // block grammar handler functions
  block.handlers = {
    b_code:     function(x){
      x.code = x.cap            // start with captured text...
        .replace(/^ {4}/gm, '') //   remove leading whitespace
        .replace(/\n+$/, '');   //   trim trailing newlines
    },
    fences:     function(x){
      x.code = x.code || ''; // use empty string for code if undefined
      x.type = 'b_code'; // render as block code
    },
    heading:    function(x){
      x.id = x.text.toLowerCase().replace(/[^\w]+/g, '-'); // create a heading ID
      x.level = x.depth.length;       // convert captured depth to a number
    },
    nptable:    processTable,
    lheading:   function(x){
      x.id = x.text.toLowerCase().replace(/[^\w]+/g, '-'); // create a heading ID
      x.level = x.depth === '=' ? 1 : 2; // depth of 1 for =, 2 for -
      x.type = 'heading'; // render as a heading
    },
    blockquote: processBlockQuote,
    list:       processList,
    html:       function(x){
      x.text = x.cap; // use captured string as text
    },
    def:        function(x,tok){
      markdown.links[x.link.toLowerCase()] = { href:x.href, title:x.title };
      tok.pop();
    },
    table:      processTable,
    paragraph:  function(x){
      x.text = x.text.replace(/\n$/,''); // trim trailing newline
    },
    b_text:     function(x,tok){
      if (tok.length > 1 && tok[tok.length-2].type === 'b_text') {
        tok[tok.length-2].text = tok[tok.length-2].text
          .concat('\n' + x.cap); // merge with previous token
        tok.pop(); // remove token no longer needed
      } else {
        //x.text = md.inline.lex(x.cap); // lex entire captured string
        x.text = x.cap; // assign captured text to 'text' field
      }
    }
  };

  // container object for rule sequences
  block.rule_sequence = {};

  // block grammar rule sequence for default mode
  block.rule_sequence.default = [
    'b_code','fences','heading','nptable','lheading','hr','blockquote',
    'list','html','def','table','paragraph'
  ];

  // block grammar rule sequence for list (or list and blockquote) state
  block.rule_sequence.list = _.chain(block.rule_sequence.default)
    .without('nptable').without('def').without('table').without('paragraph')
    .concat('b_text')
    .value()

  // block grammar rule sequence for blockquote-only state
  block.rule_sequence.bq = _.without(block.rule_sequence.default, 'def');


  ////////// FUNCTION TO TOKENIZE WITH BLOCK GRAMMAR //////////

  block.tokenize = function(src, tok, state, lineNumber) {

    // define variables for use in function
    var cap, rules;

    // initialize tokens to a blank list if unspecified
    tok = tok || [];

    // initialize lexer state if uninitialized
    state = state || {
      isList:       false, // not in a list
      isBlockQuote: false  // not in a block quote
    }

    // starting on line 0 if unspecified
    lineNumber = lineNumber || 0;

    // consume markdown in source string and convert to tokens
    eat_tokens: while (src) {

      // determine list of block rules to use
      if (state.isList) {
        rules = block.rule_sequence.list;
      } else if (state.isBlockQuote) {
        rules = block.rule_sequence.bq;
      } else {
        rules = block.rule_sequence.default;
      }

      // process leading newlines
      if (cap = markdown.processToken(src, 'newline', tok, lineNumber)) {
        if (cap.n == 1) tok.pop();  // ignore single newlines
        cap.type = 'space';         // treat as a space token
        src = src.substring(cap.n); // remove captured newline(s)
        lineNumber += cap.lines;    // increment line count
      }

      // run through list of regex rules
      for (var i = 0; i < rules.length; i++) {
        var r = rules[i];
        if (cap = markdown.processToken(src, r, tok, lineNumber)) {
          if (block.handlers[r]) {    // if there is a handler, call it
            block.handlers[r](cap,tok,state,lineNumber);
          }
          lineNumber += cap.lines;    // increment line count
          src = src.substring(cap.n); // remove captured text from string
          continue eat_tokens;        // continue consumption while loop
        }
      }

      // throw an error if none of the rules matched
      if (src) { // nothing matched and a string remains
        throw new Error('Failed to match a markdown rule: ' + src.charCodeAt(0));
      }
    }

    // return the captured tokens
    return tok;
  }

  // return the block object
  return block;
}();


///////////////
// RENDERING //
///////////////

// return a set of compiled rendering functions
markdown.render = function(){

  // define templates for rendering
  // {{myField}} ..................... insert input.myField
  // {{^myField}} .................... insert escaped html input.myField
  // {{^^myField}} ................... insert escaped text input.myField
  // {{@myField}} .................... insert mangled text input.myField
  // {{IF expr}}A{{ENDIF}} ........... if expr is true, insert "A"
  // {{IF expr}}A{{ELSE}}B{{ENDIF}} .. if expr is true, insert "A", otherwise insert "B"
  var render_templates = {
    space:      '',
    hr:         '<hr{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}/>\n',
    heading:    '<h{{level}} id="{{id}}"{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</h{{level}}>\n',
    b_code:     '<pre{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}><code{{IF lang}} class="lang-{{lang}}"{{ENDIF}}>{{^^code}}\n</code></pre>{{IF lang}}\n{{ENDIF}}',
    blockquote: '<blockquote{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>\n{{text}}</blockquote>\n',
    html:       '{{text}}',
    list:       '<{{listtype}}{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>\n{{text}}</{{listtype}}>\n',
    listitem:   '<li{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</li>\n',
    paragraph:  '<p{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</p>\n',
    b_text:     '<p{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</p>\n',
    table:      '<table{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>\n<thead>\n{{header}}</thead>\n<tbody>\n{{body}}</tbody>\n</table>\n',
    tablerow:   '<tr{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>\n{{content}}</tr>\n',
    tablecell:  '<{{IF header}}th{{ELSE}}td{{ENDIF}}{{IF align}} style="text-align:{{align}}"{{ENDIF}}{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</{{IF header}}th{{ELSE}}td{{ENDIF}}>\n',
    strong:     '<strong{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</strong>',
    em:         '<em{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</em>',
    i_code:     '<code{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{^^text}}</code>',
    i_text:     '{{^text}}',
    i_html:     '{{text}}',
    br:         '<br{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}/>',
    del:        '<del{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</del>',
    link:       '<a href="{{^href}}"{{IF title}} title="{{^title}}"{{ENDIF}}{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</a>',
    mailto:     '<a href="{{@href}}"}{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{@text}}</a>',
    image:      '<img src="{{^href}}" alt="{{^text}}"{{IF title}} title="{{^title}}"{{ENDIF}}{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}/>',
    tag:        '{{text}}'
  }

  // escape HTML (taken from from marked.js)
  // - escape(html) to escape HTML (respecting already-escaped characters)
  // - escape(html,true) to escape text inside HTML (like code)
  var escape = function(html, encode) {
    return html
      .replace(                 // replace ...
        !encode                 //   not encode? (default behavior) ...
          ? /&(?!#?\w+;)/g      //     '&' that is not part of an escape sequence
          : /&/g,               //     raw '&' (if 'encode' is true)
        '&amp;')                // -> &amp;
      .replace(/</g, '&lt;')    // replace < -> &lt;
      .replace(/>/g, '&gt;')    // replace > -> &gt;
      .replace(/"/g, '&quot;')  // replace " -> &quot;
      .replace(/'/g, '&#39;')   // replace ' -> &#39;
  };

  // mangle mailto links (taken from marked.js)
  var mangle = function(text) {
    var out = '';                           // initialize output string
    for (var i = 0; i < text.length; i++) { // iterate over characters in input...
      var ch = text.charCodeAt(i);          //   current decimal character code
      if (Math.random() > 0.5) {            //   with 50% probability...
        ch = 'x' + ch.toString(16);         //     use hex representation instead
      }                                     //
      out += '&#' + ch + ';';               //   append hex/decimal character
    }                                       //
    return out;                             // return generated string
  };

  // convert a template to a processing function
  function convertTemplate(src) {
    function processString(src) {
      var code = [], cap;
      while(src) {
        if (src.match(/^{{IF[\s\S]*?{{ENDIF}}/)) {
          var sub_src = src.match(/^{{IF[\s\S]*?{{ENDIF}}/);
          if (cap = /^{{IF ([\s\S]*?)}}([\s\S]*?){{ELSE}}([\s\S]*?){{ENDIF}}/.exec(sub_src)) {
            code.push('(x.'+cap[1]+'?'+processString(cap[2])+':'+processString(cap[3])+')');
          } else if (cap = /^{{IF ([\s\S]*?)}}([\s\S]*?){{ENDIF}}/.exec(sub_src)) {
            code.push('(x.'+cap[1]+'?'+processString(cap[2])+":'')");
          } else {
            throw new Error('Failed to process template: invalid {{IF}} expression');
          }
        } else if (cap = /^{{(?!\^)(?!@)(.*?)}}/.exec(src)) {
          code.push('x.'+cap[1]);
        } else if (cap = /^{{\^\^(.*?)}}/.exec(src)) {
          code.push('escape(x.'+cap[1]+',true)');
        } else if (cap = /^{{\^(.*?)}}/.exec(src)) {
          code.push('escape(x.'+cap[1]+')');
        } else if (cap = /^{{@(.*?)}}/.exec(src)) {
          code.push('mangle(x.'+cap[1]+')');
        } else if (cap = /^\n/.exec(src)) {
          code.push("'\\n'");
        } else if (cap = /^.+?(?={{|\n|$)/.exec(src)) {
          code.push("'" + cap[0] + "'");
        } else {
          throw new Error('Failed to process template');
        }
        if (cap[0].length == 0) {
          throw new Error('Failed to consume a token');
        }
        src = src.slice(cap[0].length);
      }
      return code.join('+');
    }
    var prefix = '';
    if (src.match(/{{\^/)) { // add escape code if needed
      prefix = prefix + 'escape=' + escape.toString().replace(/\/\/.*/g, '').replace(/\s+/g, '').replace(/var/g,'var ').replace('return','return ') + ';';
    }
    if (src.match(/{{@/)) { // add mangle code if needed
      prefix = prefix + 'mangle=' + mangle.toString().replace(/\/\/.*/g, '').replace(/\s+/g, '').replace(/var/g,'var ').replace('return','return ') + ';';
    }
    var fx = prefix + 'return ' + processString(src.replace(/'/g,"\\'"));
    return new Function('x', fx);
  }

  // compile rendering templates
  var keys = _.keys(render_templates);
  var render = {};
  for (var i = 0; i < keys.length; i++) {
    render[keys[i]] = convertTemplate(render_templates[keys[i]]);
  }

  // attach escape and mangle functions
  render.escape = escape;
  render.mangle = mangle;

  // return the compiled templates
  return render;
}();


////////////
// PARSER //
////////////

// return a parser function
markdown.parse = function(){

  // container for token-specific parsing
  var parser_data = {};

  // perform inline lexing of text blocks
  // note that this has to happen after block lexing is complete so that
  // all link definitions have been processed
  parser_data.heading   = function(x){ x.text = markdown.inline.lex(x.text) };
  parser_data.lheading  = function(x){ x.text = markdown.inline.lex(x.text) };
  parser_data.paragraph = function(x){ x.text = markdown.inline.lex(x.text) };
  parser_data.b_text    = function(x){ x.text = markdown.inline.lex(x.text) };
  parser_data.html      = function(x){
    if (x.pre !== 'pre' && x.pre !== 'script' && x.pre !== 'style') {
      x.text = markdown.inline.lex(x.text);
    }
  };

  // perform inline lexing of non-loose list items
  parser_data.listitem = function(x){
    if (!x.loose) {
      var itemText = [];
      for (var i = 0; i < x.text.length; i++) {
        var tok = x.text[i];
        if (tok.type === 'b_text') {
          itemText = itemText.concat(markdown.inline.lex(tok.text));
        } else {
          itemText.push(tok);
        }
      }
      x.text = itemText;
    }
  }


  ////////// TABLE HANDLER //////////

  parser_data.table = function(x, opt){

    // process header
    var cell = '';
    for (var i = 0; i < x.header.length; i++){
      cell += markdown.render.tablecell({
        header: true,
        align:  x.align[i],
        text:   parser(markdown.inline.lex(x.header[i]), opt)
      })
    }
    var header = markdown.render.tablerow({ content: cell });

    // process rows
    var body = '';
    for (var i = 0; i < x.cells.length; i++) {
      var row = x.cells[i];
      var cell = '';
      for (var j = 0; j < row.length; j++) {
        cell += markdown.render.tablecell({
          header: false,
          align:  x.align[j],
          text:   parser(markdown.inline.lex(row[j]), opt)
        })
      }
      body += markdown.render.tablerow({ content: cell });
    }

    // return assembled output
    x.header = header;
    x.body = body;
  }


  ////////// PARSER //////////

  // render a token
  var renderToken = function(tok){
    if (markdown.render[tok.type]) {
      return markdown.render[tok.type](tok); // render token and add to output
    } else {
      throw new Error('Unrecognized rendering input: ' + tok.type);
    }
  }

  // parse list of tokens and return HTML code as a string
  function parser(tokens, opt) {
    var out = new Array(tokens.length);
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i]; // grab next token
      if (!opt.includeLines) tok.sourceLine = null;
      if (parser_data[tok.type]) parser_data[tok.type](tok, opt); // convert token
      if (_.isArray(tok.text)) { // convert array of inline tokens to string
        tok.text = parser(tok.text, opt);
      }
      out[i] = renderToken(tok);
    }
    return out.join(''); // squish together output and return it
  }

  // return the parser function
  return parser;
}();


///////////////////
// PROCESS INPUT //
///////////////////

// function to convert markdown to HTML
markdown.toHTML = function(src, opt) {

  // process options
  opt = opt || {};
  opt.includeLines = opt.includeLines || false;

  // preprocess source string
  src = src
    .replace(/\r\n|\r/g, '\n')  // use consistent newline format
    .replace(/\t/g, '    ')     // replace tabs with spaces
    .replace(/\u00a0/g, ' ')    // replace non-breaking space with space
    .replace(/\u2424/g, '\n')   // replace unicode newline with newline
    .replace(/^ +$/gm, '');     // replace blank lines with ''

  // create/reset hyperlink lookup table
  markdown.links = {};

  // convert source string to block grammar tokens (md.tok)
  // equivalent to marked.js `marked.lexer(src)` or `Lexer.lex(src)`
  var tok = markdown.block.tokenize(src);

  // parse block grammar tokens and return results
  // equvalent to marked.js `marked.parser(tok)` or `Parser.prototype.parse(tok)`
  //   - Call Parser.prototype.tok() for each token...
  //     - Call renderer for each token
  //     - Delegate to inline lexer as needed
  //   - Append rendered results to output string
  //   - Return output string
  return markdown.parse(tok, opt);

}
