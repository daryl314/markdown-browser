// module object
(typeof window !== 'undefined' ? window : global).markdown = (typeof window !== 'undefined' ? window : global).markdown || {};

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
      var lastArg = arguments[arguments.length-1];
      var hasReplacements = typeof lastArg === 'object' && !(lastArg instanceof RegExp);

      // combine inputs into a single regex
      var src = '';
      for ( var i = 0;
            i < (hasReplacements ? arguments.length-1 : arguments.length); // don't include replacements
            i++) {
        src = src + (arguments[i].source || arguments[i]); // use regex source if available
      }
      var out = new RegExp(src);

      // replace tokens in the assembled regex using the lookup map
      if (hasReplacements) {
        out = out.source;
        for (var k in arguments[arguments.length-1]) {
          var v = arguments[arguments.length-1][k];
          out = out.replace(new RegExp(k,'g'), trimAnchor(v.source||v));
        };
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

  // regex for a cross-referenced link with a link title
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

  // regex for a cross-referenced link without link text: [foo][] or [foo]
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
  regex.nolink.tokens = ['text']; // combination href and text


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
    /^/,            // anchor to start of string
    /\\\\\(/,       // \\(
      /\s*/,        //   optional whitespace
      /([\s\S]+?)/, //   captured minimal multi-line wildcard
      /\s*/,        //   optional whitespace
    /\\\\\)/        // \\)
  );
  regex.i_latex.tokens = ['latex'];


  ////////// BLOCK LATEX REGEX //////////

  regex.b_latex = regex.Combine(
    /^/,            // anchor to start of string
    / */,           // optional spaces
    /\$\$/,         // $$
      /\s*/,        //   optional whitespace
      /([\s\S]+?)/, //   captured minimal multi-line regex
      /\s*/,        //   optional whitespace
    /\$\$/          // $$
  );
  regex.b_latex.tokens = ['latex'];


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
      /|/,              //   OR
        /\$\$/,         //     $$
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

