// placeholder for data
if (typeof window !== 'undefined') {
  window.markdown = {};
} else {
  global.markdown = {};
}

////////////////////////////////////
// CLASS TO DEFINE A GRAMMAR RULE //
////////////////////////////////////

// subclass regexp to customize behavior?  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/@@match

class ResultArray {
  constructor(name, arr) {
    this.leader = '  ';
    this.name = name;
    this.arr = arr;
  }

  render() {
    return this._render().join('\n')
  }

  _render(depth=0) {
    let out = [];
    out.push(this.leader.repeat(depth) + `<${this.name}>`);
    this.arr.forEach(x => {
      out = out.concat(x._render(depth+1))
    })
    out.push(this.leader.repeat(depth) + `</${this.name}>`);
    return out    
  }
}

class Result {
  constructor(rule, res, pos) {
    this.rule = rule;
    this.match = res.slice(1);
    this.initialPosition = pos;
    this.cap = res[0];
    this.finalPosition = pos + this.cap.length;
    this.n = this.cap.length;
    this.lines = (this.cap.match(/\n/g) || []).length;
    this.leader = '  ';
    this.attr = {};

    // assign tokenized results
    if (this.rule.tokens) {
      for (let i = 0; i < this.rule.tokens.length; i++) {
        if (this.rule.tokens[i]) {
          let tok = this.rule.tokens[i];
          if (this.rule.sub_rules && this.rule.sub_rules[tok]) {
            let tokRule = this.rule.sub_rules[tok];
            if (this.rule.ruleset) {
              tokRule = this.rule.ruleset.rules[tokRule];
            }
            this.attr[tok] = tokRule.parse(this.match[i]);
          } else {
            this.attr[tok] = this.match[i];
          }
        }
      }
    }
  }

  render() {
    return this._render().join('\n')
  }

  _indent(depth, txt) {
    if (typeof txt === 'string') {
      return this.leader.repeat(depth) + txt
    } else {
      return txt.map(x => this.leader.repeat(depth) + x)
    }
  }

  _rawAttr() {
    return Object.keys(this.attr).filter(k => typeof this.attr[k] === 'string')
  }

  _nestedAttr() {
    return Object.keys(this.attr).filter(k => typeof this.attr[k] !== 'string')
  }

  _attrString() {
    let inner = this._rawAttr().map(k => 
      `${k}="${this.attr[k].replace(/\n/g, '\\n')}"`
    )
    return [`${this.rule.name} lines=${this.lines}`].concat(inner).join(' ')
  }

  _render(depth=0) {

    // convert nested objects into text blocks
    let nestedAttr = this._nestedAttr().map(k => this._indent(1,
      [`<${k}>`]
      .concat(this.attr[k]._render(1))
      .concat([`</${k}>`])
    ))

    // special case for no nested objects
    if (nestedAttr.length == 0) {
      return this._indent(depth,`<${this._attrString()}/>`)
    }

    // generate output text
    let out = [];
    out.push(`<${this._attrString()}>`);
    nestedAttr.forEach(x => {out = out.concat(x)});
    out.push(`</${this.rule.name}>`);

    // return indented text
    return this._indent(depth, out)
  }
}

class RuleSet {
  constructor(baseRule, regex) {
    this.baseRule = baseRule;
    this.regex = regex;
    this.rules = {};
  }

  parse(txt, pos=0) {
    return this.rules[this.baseRule].parse(txt,pos)
  }

  addRule(name, regex, sub_rules={}) {
    this.rules[name] = new Rule(name, regex, sub_rules, this);
  }

  addRules(def) {
    Object.keys(def).forEach(key => {
      var [re,sub_rules] = def[key];
      if (this.regex) {
        re = this.regex[re];
      }
      this.addRule(key, re, sub_rules);
    })
  }

  addDispatchRule(name, def) {
    let rules = def.split('|').map(r => {
      if (this.rules[r] === undefined) throw new Error('Undefined rule: '+r);
      return this.rules[r]
    })
    this.rules[name] = new DispatchRule(name, rules);
  }

  addRepeatingRule(name, rule) {
    this.rules[name] = new RepeatingRule(name, this.rules[rule]);
  }
}

class Rule {
  constructor(name, regex, sub_rules, ruleset, processor) {
    this.name = name;
    this.regex = regex;
    this.tokens = regex.tokens;
    this.sub_rules = sub_rules;
    this.ruleset = ruleset;
    this.processor = processor;
  }

  parse(txt, pos=0, fail_ok=false) {
    let res = this.regex.exec(txt.slice(pos));
    if (res) {
      return new Result(this, res, pos)
    } else if (fail_ok) {
      return null
    } else {
      throw new Error('Failed to match regex rule: ' + txt.charCodeAt(0));
    }
  }
}

class RepeatingRule {
  constructor(name, rule) {
    this.name = name;
    this.rule = rule;
  }

  parse(txt, pos=0) {
    let out = [];
    let loc = pos;
    while (loc + 1 < txt.length) {
      let res = this.rule.parse(txt,loc);
      if (res.n == 0) {
        throw new Error('Empty regex match')
      } else {
        loc = res.finalPosition;
        out.push(res);
      }
    }
    return new ResultArray(this.name, out);
  }
}

class DispatchRule {
  constructor(name, rules) {
    this.name = name;
    this.rules = rules;
  }

  parse(txt, pos=0) {
    for (var i = 0; i < this.rules.length; i++) {
      let res = this.rules[i].parse(txt,pos,true);
      if (res) {
        return res;
      }
    }
    throw new Error('Failed to match a dispatch rule: ' + txt.charCodeAt(0));
  }
}

///////////////////////////////////
// CLASS TO DEFINE AST RENDERING //
///////////////////////////////////

class Renderer {
  // define templates for rendering
  // {{myField}} ..................... insert input.myField
  // {{^myField}} .................... insert escaped html input.myField
  // {{^^myField}} ................... insert escaped text input.myField
  // {{@myField}} .................... insert mangled text input.myField
  // {{IF expr}}A{{ENDIF}} ........... if expr is true, insert "A"
  // {{IF expr}}A{{ELSE}}B{{ENDIF}} .. if expr is true, insert "A", otherwise insert "B"
  constructor(def={}) {
    this.rules = {};
    Object.keys(def).forEach(k => {this.addRule(k, def[k])})
  }

  // add a rule to the definition set
  addRule(name, def) {
    this.rules[name] = Renderer.convertTemplate(def);
  }

  // render an input object
  render(obj, currentLine=1) {

    // input is an array: render elements and join strings
    if (obj instanceof ResultArray) {
      let line = currentLine;
      return obj.arr.map(x => {
        let txt = this.render(x, line);
        line += x.lines;
        return txt
      }).join('');

    // input is an AST element: render with template
    } else if (obj instanceof Result) {

      // identify template
      var fn;
      if (fn = this.rules[obj.rule.name]) {

        // render nested AST elements
        let attr = {};
        Object.keys(obj.attr).forEach(f => {
          attr[f] = this.render(obj.attr[f], currentLine)
        })

        // attach line number
        attr.sourceLine = currentLine;

        // perform post-processing if applicable
        if (obj.rule.processor) {
          obj.rule.processor(attr);
        }

        // call template rendering function
        return this.rules[obj.rule.name](attr)

      // error if template wasn't found
      } else {
        throw new Error('Unrecognized rule: '+obj.rule.name)
      }

    // otherwise pass through raw value
    } else {
      return obj
    }
  }
  
  // escape HTML (taken from from marked.js)
  // - escape(html) to escape HTML (respecting already-escaped characters)
  // - escape(html,true) to escape text inside HTML (like code)
  static escape(html, encode) {
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
  static mangle(text) {
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

  // helper function to convert a template string to JavaScript code
  static _templateToCode(src) {
    
    // accumulated code
    var code = [];

    // variables to hold captured text
    var cap, cap2;

    // consume string
    while(src) {

      // match an IF block
      if (cap2 = src.match(/^{{IF[\s\S]*?{{ENDIF}}/)) {

        // process if-else
        if (cap = /^{{IF ([\s\S]*?)}}([\s\S]*?){{ELSE}}([\s\S]*?){{ENDIF}}/.exec(cap2)) {
          code.push('(x.'+cap[1]+'?'+Renderer._templateToCode(cap[2])+':'+Renderer._templateToCode(cap[3])+')');

        // process if
        } else if (cap = /^{{IF ([\s\S]*?)}}([\s\S]*?){{ENDIF}}/.exec(cap2)) {
          code.push('(x.'+cap[1]+'?'+Renderer._templateToCode(cap[2])+":'')");

        // exception otherwise
        } else {
          throw new Error('Failed to process template: invalid {{IF}} expression');
        }
      }

      // match other expressions 
      else if (cap = /^{{(?!\^)(?!@)(.*?)}}/.exec(src)) code.push('x.'+cap[1]                ); // field
      else if (cap = /^{{\^\^(.*?)}}/       .exec(src)) code.push('escape(x.'+cap[1]+',true)'); // escaped text
      else if (cap = /^{{\^(.*?)}}/         .exec(src)) code.push('escape(x.'+cap[1]+')'     ); // escaped html
      else if (cap = /^{{@(.*?)}}/          .exec(src)) code.push('mangle(x.'+cap[1]+')'     ); // mangled text
      else if (cap = /^\n/                  .exec(src)) code.push("'\\n'"                    ); // newline
      else if (cap = /^.+?(?={{|\n|$)/      .exec(src)) code.push("'" + cap[0] + "'"         ); // normal text
      
      // otherwise throw an exception
      else {
        throw new Error('Failed to process template');
      }

      // if match length was zero, throw an exception
      if (cap[0].length == 0) {
        throw new Error('Failed to consume a token');
      }

      // slice off matched text and continue processing
      src = src.slice(cap[0].length);

    } // end of string consumption

    // return code to concatenate the components together
    return code.join('+');
  }

  // helper function to return the code associated with a function
  static _functionToCode(fn, name) {
    var txt = fn.toString()
      .replace(/\/\/.*/g, '')
      .replace(/\s+/g, '')
      .replace(/var/g,'var ')
      .replace('return','return ') + ';';
    return txt
  }

  // convert a template to a processing function
  static convertTemplate(src) {
    var fx = 
      ( src.match(/{{\^/) // add escape function if there is any escaping in template
        ? 'function '+Renderer._functionToCode(Renderer.escape) 
        : ''
      ) + (src.match(/{{@/) // add mangle function if there is any mangling in the template
        ? 'function '+Renderer._functionToCode(Renderer.mangle)
        : ''
      ) + 'return '+Renderer._templateToCode(src.replace(/'/g,"\\'"));
    return new Function('x', fx);
  }
}

//////////////////////////
// DEFINE REGEX GRAMMAR //
//////////////////////////

// compile regex grammar
let regex = function(){

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

  regex.strong_us = regex.Combine(
    /^__/,        //   __ anchored at start of line
    /([\s\S]+?)/, //   minimal multi-line wildcard
    /__/,         //   __
    /(?!_)/,      //   not followed by another _
  );
  regex.strong_us.tokens = ['text'];

  regex.strong_as = regex.Combine(
    /^\*\*/,      //   ** anchored at start of line
    /([\s\S]+?)/, //   minimal multi-line wildcard
    /\*\*/,       //   **
    /(?!\*)/      //   not followed by another *
  );
  regex.strong_as.tokens = ['text'];

  regex.strong = regex.Combine(/^STRONG_US|^STRONG_AS/, {
    STRONG_US: regex.strong_us,
    STRONG_AS: regex.strong_as
  })
  regex.strong.tokens = ['opt1','opt2'];


  ////////// ITALICS REGEX //////////

  regex.em_us = regex.Combine(
    /^\b_/,            // word boundary followed by _
    '(',              // captured text
      '(?:',          //   one or more (minimal) ...
          /[^_]/,     //       non-underscore character
        /|/,          //     OR
          /__/,       //       double underscore
      ')+?',          //   end grouping
    ')',              // end captured text
    /_\b/             // _ followed by word bounary
  );
  regex.em_us.tokens = ['text'];

  regex.em_as = regex.Combine(
    /^\*/,             // *
    '(',              // captured text
      '(?:',          //   one or more (minimal) ...
          /\*\*/,     //       **
        /|/,          //     OR
          /[\s\S]/,   //       minimal multi-line wildcard`
      ')+?',          //   end grouping
    ')',              // end captured text
    /\*/,             // *
    /(?!\*)/          // not followed by another *
  );
  regex.em_as.tokens = ['text'];

  regex.em = regex.Combine(
    /^EM_US|^EM_AS/, { // match anchored underscore or asterisk pattern
      EM_US: regex.em_us,
      EM_AS: regex.em_as
    }
  );
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
  regex.i_code.tokens = ['ticks', 'text'];


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

  // pattern to terminate inline text block
  var i_text_after = regex.Combine(
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

  // non-captured version to match marked.js
  regex.i_text = regex.Combine(
    /^[\s\S]+?/, i_text_after
  );

  // version with captured text
  regex.i_text1 = regex.Combine(
    /^([\s\S]+?)/, i_text_after
  );
  regex.i_text1.tokens = ['text'];


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



//////////////////////////
// DEFINE GRAMMAR RULES //
//////////////////////////

// create a container for set of rules
let Model = new RuleSet(
  'Block',  // top-level rule name
  regex     // regex definition map
);

// base-level block rules
Model.addRules({
  Heading   : ['heading'  , {text:'Inline'}],
  Paragraph : ['paragraph', {text:'Inline'}]
});

// 'Block' rule is repeated dispatch over block types
Model.addDispatchRule('BlockElement', 'Heading|Paragraph');
Model.addRepeatingRule('Block', 'BlockElement');

// base-level inline rules
/*inline.rules = [
  'i_latex', 'b_latex', 'escape', 'autolink', 'url', 'tag', 'link', 'reflink', 'nolink',
  'strong', 'em', 'i_code', 'br', 'del', 'i_text'
]*/
Model.addRules({
  StrongUs   : ['strong_us', {text:'Inline'}],
  StrongAs   : ['strong_as', {text:'Inline'}],
  EmUs       : ['em_us'    , {text:'Inline'}],
  EmAs       : ['em_as'    , {text:'Inline'}],
  InlineCode : ['i_code'   , {}             ],
  Break      : ['br'       , {}             ],
  Del        : ['del'      , {text:'Inline'}],
  InlineText : ['i_text1'  , {}             ]
});

// 'Inline' rule is repeated dispatch over inline types
Model.addDispatchRule('InlineElement', 'StrongUs|StrongAs|EmUs|EmAs|InlineCode|Break|Del|InlineText');
Model.addRepeatingRule('Inline', 'InlineElement');

////////////////////////////////////
// DEFINE POST-PROCESSING ACTIONS //
////////////////////////////////////

// define actions
let post_process = {
  Heading: function(x) {
    x.level = x.depth.length; // convert captured depth to a number
    x.id = x.text.toLowerCase().replace(/<.*?>/g,'').replace(/[^\w]+/g, '-'); // create a heading ID
  }
};

// attach actions
Object.keys(post_process).forEach(k => {
  Model.rules[k].processor = post_process[k]
})

////////////////////////
// CONFIGURE RENDERER //
////////////////////////

renderer = new Renderer({
   Heading    : '<h{{level}} id="{{id}}"{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</h{{level}}>\n',
   Paragraph  : '<p{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</p>\n',
   StrongUs   : '<strong{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</strong>',
   StrongAs   : '<strong{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</strong>',
   EmUs       : '<em{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</em>',
   EmAs       : '<em{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</em>',
   InlineCode : '<code{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{^^text}}</code>',
   Break      : '<br{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}/>',
   Del        : '<del{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</del>',
   InlineText : '{{text}}'
})

// renderer = new Renderer({
//   space:      '',
//   hr:         '<hr{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}/>\n',
//   Heading:    '<h{{level}} id="{{id}}"{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</h{{level}}>\n',
//   b_code:     '<pre{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}><code{{IF lang}} class="lang-{{lang}}"{{ENDIF}}>{{^^code}}\n</code></pre>{{IF lang}}\n{{ENDIF}}',
//   blockquote: '<blockquote{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>\n{{text}}</blockquote>\n',
//   html:       '{{text}}',
//   list:       '<{{listtype}}{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>\n{{text}}</{{listtype}}>\n',
//   listitem:   '<li{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</li>\n',
//   paragraph:  '<p{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</p>\n',
//   b_text:     '<p{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</p>\n',
//   table:      '<table{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>\n<thead>\n{{header}}</thead>\n<tbody>\n{{body}}</tbody>\n</table>\n',
//   tablerow:   '<tr{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>\n{{content}}</tr>\n',
//   tablecell:  '<{{IF header}}th{{ELSE}}td{{ENDIF}}{{IF align}} style="text-align:{{align}}"{{ENDIF}}{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</{{IF header}}th{{ELSE}}td{{ENDIF}}>\n',
//   strong:     '<strong{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</strong>',
//   em:         '<em{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</em>',
//   i_code:     '<code{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{^^text}}</code>',
//   i_text:     '{{^text}}',
//   i_html:     '{{text}}',
//   br:         '<br{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}/>',
//   del:        '<del{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</del>',
//   link:       '<a href="{{^href}}"{{IF title}} title="{{^title}}"{{ENDIF}}{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</a>',
//   mailto:     '<a href="{{@href}}"}{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{@text}}</a>',
//   image:      '<img src="{{^href}}" alt="{{^text}}"{{IF title}} title="{{^title}}"{{ENDIF}}{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}/>',
//   tag:        '<{{IF isClosing}}/{{ENDIF}}{{text}}{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}{{IF selfClose}}/{{ENDIF}}>',
//   i_latex:    '<latex class="inline"{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{latex}}</latex>',
//   b_latex:    '<latex class="block"{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{latex}}</latex>'
// });















class GrammarRule {
  contructor() {

  }

  /**
   * Attempt to match a regex rule
   * @param {*} src source string to process
   * @param {*} rule regex rule to attempt to match
   * @param {*} stack 
   * @param {*} line 
   */
  static processToken(src, rule, stack, line=1) {
    var cap = regex[rule].exec(src);          // try to match rule
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
}

// function to try processing a regex rule
markdown.processToken = function(src, rule, stack, line){
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
    'i_latex', 'b_latex', 'escape', 'autolink', 'url', 'tag', 'link', 'reflink', 'nolink',
    'strong', 'em', 'i_code', 'br', 'del', 'i_text'
  ]

  // rule sequence when in 'inLink' state
  inline.rules_link = [];
  for (var i = 0; i < inline.rules.length; i++) {
    if (inline.rules[i] !== 'url') inline.rules_link.push(inline.rules[i]);
  }

  // function to handle lexing by instantiating Inline Lexer
  inline.lex = function(src, lineNumber, inLink){
    var myLexer = new inline.Lexer(src, lineNumber, inLink);
    return myLexer.lex();
  }

  ////////// LEXER CLASS //////////

  // constructor
  inline.Lexer = function(src, lineNumber, inLink){
    this.line   = lineNumber;       // current line number
    this.src    = src;              // remaining text to process
    this.tok    = [];               // list of processed tokens
    this.inLink = inLink || false;  // state flag: inside a hyperlink?
  }

  // processor: consume markdown in source string and convert to tokens
  inline.Lexer.prototype.lex = function(){
    var cap;
    inline_consumer: while(this.src){
      var rules = this.inLink ? inline.rules_link : inline.rules;
      for (var i = 0; i < rules.length; i++) {
        var r = rules[i];                      // current rule in list
        if (cap = markdown.processToken(this.src, r, this.tok, this.line)) {
          if (this[r]) this[r](cap);              // execute handler
          this.src = this.src.substring(cap.n);   // remove captured text
          this.line += cap.lines;                 // increment line counter
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
    tok.text = inline.lex(txt||tok.text, this.line, inLink||this.inLink);
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
    x.isClosing = x.cap[1] === '/';                             // closing tag if ^</ ...
    x.selfClose = x.cap[x.cap.length-2] === '/';                // self closing if ... />$
    x.text      = x.cap.replace(/^<\/?([\s\S]*?)\/?>$/, '$1');  // strip outer <>
    if (x.isClosing) x.sourceLine = null;                       // remove line # for closing tags
    if      (  /^<a /i.test(x.cap)) this.inLink = true;         // in a link if ^<a ...
    else if (/^<\/a /i.test(x.cap)) this.inLink = false;        // no longer in a link if ^</a ...
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

      // if there is unmatched latex, combine list items
      while (
        (i < cap.length && ( // there are tokens to join
                (item.match(/\$\$/g) && item.match(/\$\$/g).length % 2 == 1) // unmatched block latex
            ||  (item.match(/\\\\\(/) || []).length > (item.match(/\\\\\)/) || []).length // unmatched inline latex
        ))
      ) {
        item = item + cap[i+1];
        cap = cap.slice(0,i).concat(cap.slice(i+1))
      }

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

      // add list item to list
      t.text.push({
        cap:        item,
        n:          item.length,
        type:       'listitem',
        text:       myTok,
        sourceLine: lineNumber,
        loose:      loose,
      })

      // increment current line to reflect size of list item
      lineNumber += item.split(/\n/).length;
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
  block.rule_sequence.list = [];
  for (var i = 0; i < block.rule_sequence.default.length; i++) {
    var rule_i = block.rule_sequence.default[i];
    if (rule_i !== 'nptable' && rule_i !== 'def' && rule_i !== 'table' && rule_i !== 'paragraph') {
      block.rule_sequence.list.push(rule_i);
    }
  }
  block.rule_sequence.list.push('b_text');

  // block grammar rule sequence for blockquote-only state
  block.rule_sequence.bq = [];
  for (var i = 0; i < block.rule_sequence.default.length; i++) {
    var rule_i = block.rule_sequence.default[i];
    if (rule_i !== 'def') block.rule_sequence.bq.push(rule_i);
  }


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

    // starting on line 1 if unspecified
    lineNumber = lineNumber || 1;

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
    tag:        '<{{IF isClosing}}/{{ENDIF}}{{text}}{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}{{IF selfClose}}/{{ENDIF}}>',
    i_latex:    '<latex class="inline"{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{latex}}</latex>',
    b_latex:    '<latex class="block"{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{latex}}</latex>'
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
  var render = {};
  for (var key in render_templates) {
    render[key] = convertTemplate(render_templates[key]);
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
  parser_data.heading   = function(x){ x.text = markdown.inline.lex(x.text,x.sourceLine) };
  parser_data.lheading  = function(x){ x.text = markdown.inline.lex(x.text,x.sourceLine) };
  parser_data.paragraph = function(x){ x.text = markdown.inline.lex(x.text,x.sourceLine) };
  parser_data.b_text    = function(x){ x.text = markdown.inline.lex(x.text,x.sourceLine) };
  parser_data.html      = function(x){
    if (x.pre !== 'pre' && x.pre !== 'script' && x.pre !== 'style') {
      x.text = markdown.inline.lex(x.text,x.sourceLine);
    }
  };

  // perform inline lexing of non-loose list items
  parser_data.listitem = function(x){
    if (!x.loose) {
      var itemText = [];
      for (var i = 0; i < x.text.length; i++) {
        var tok = x.text[i];
        if (tok.type === 'b_text') {
          itemText = itemText.concat(markdown.inline.lex(tok.text,tok.sourceLine));
        } else {
          itemText.push(tok);
        }
      }
      x.text = itemText;
    }
  }


  ////////// TABLE HANDLER //////////

  parser_data.table = function(x, opt){

    // current line counter
    var currentLine = opt.includeLines ? x.sourceLine : undefined;

    // process header
    var cell = '';
    for (var i = 0; i < x.header.length; i++){
      cell += markdown.render.tablecell({
        header: true,
        align:  x.align[i],
        text:   parser(markdown.inline.lex(x.header[i],currentLine), opt)
      })
    }
    var header = markdown.render.tablerow({
      content: cell,
      sourceLine: currentLine
    });
    currentLine += 2; // header row and separator row below it

    // process rows
    var body = '';
    for (var i = 0; i < x.cells.length; i++) {
      var row = x.cells[i];
      var cell = '';
      for (var j = 0; j < row.length; j++) {
        cell += markdown.render.tablecell({
          header: false,
          align:  x.align[j],
          text:   parser(markdown.inline.lex(row[j],currentLine), opt)
        })
      }
      body += markdown.render.tablerow({
        content: cell,
        sourceLine: currentLine++
      });
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

  // parse list of block tokens and return HTML code as a string
  function parser(tokens, opt) {

    // is output rendered HTML?
    let doRender = !opt.ast;

    // process tokens
    let out = tokens.map(tok => {

      // remove source line if source tagging is disabled in options
      if (!opt.includeLines) 
        tok.sourceLine = null;

      // if a parsing function exists for token type, call it to perform inline lexing
      if (parser_data[tok.type])
        parser_data[tok.type](tok, opt);

      // if rendering to HTML, recurse to convert an array of inline tokens to a string
      if (doRender && Array.isArray(tok.text)) { // convert array of inline tokens to string
        tok.text = parser(tok.text, opt);
      }

      // render to HTML if applicable
      if (doRender) {
        return renderToken(tok)
      } else {
        return tok
      }
    })

    // var out = new Array(tokens.length);
    // for (var i = 0; i < tokens.length; i++) {
    //   var tok = tokens[i]; // grab next token
    //   if (!opt.includeLines) tok.sourceLine = null;
    //   if (parser_data[tok.type]) parser_data[tok.type](tok, opt); // convert token
    //   if (Array.isArray(tok.text)) { // convert array of inline tokens to string
    //     tok.text = parser(tok.text, opt);
    //   }
    //   out[i] = renderToken(tok);
    // }

    // squish output if rendering
    if (doRender) {
      return out.join('')
    } else {
      return out
    }
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
  opt.wrapInHtml   = opt.wrapInHtml   || false;

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

  // parse block grammar tokens
  // equvalent to marked.js `marked.parser(tok)` or `Parser.prototype.parse(tok)`
  //   - Call Parser.prototype.tok() for each token...
  //     - Call renderer for each token
  //     - Delegate to inline lexer as needed
  //   - Append rendered results to output string
  //   - Return output string
  let html = markdown.parse(tok, opt);

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

////////////////////////
// MARKDOWN AST CLASS //
////////////////////////

class TreeNode {

  constructor(node) {

    // attach input node
    this.node = node;

    // attributes to exclude from reference list
    let excludedAttr = TreeNode.excludedAttr();

    // lookup for attribute lists
    let attrLookup = TreeNode.dumpAttributes();

    // list of attributes to display
    if (attrLookup[this.node.type]) {
      this.displayAttr = attrLookup[this.node.type];
    } else {
      this.displayAttr = Object.keys(this.node).filter(x => !excludedAttr.includes(x));
    }

    // indentation
    this.indent = '  ';
  }

  dump(level=0) {
    console.log(this._dump(level).join('\n'));
  }

  _dump(level = 0) {
    let inlineAttr = [];
    let blockAttr  = [];
    this.displayAttr.forEach(attr => {
      let nodeData = this.node[attr];
      if (typeof nodeData === 'string') {
        blockAttr = blockAttr.concat(
          [ `${this.indent.repeat(level)}<${attr}>` ],
          nodeData.split(/\n/g).map(txt => this.indent.repeat(level+1)+txt),
          [ `${this.indent.repeat(level)}</${attr}>` ]
        )
      } else if (Array.isArray(this.node[attr])) {
        nodeData.forEach(el => {
          blockAttr = blockAttr.concat((new TreeNode(el))._dump(level+1))
        })
      } else if (typeof nodeData === 'object') {
        barf
      } else {
        inlineAttr.push(attr);
      }
    });
    let attrText = inlineAttr.map(a => `${a}="${this.node[a]}"`);
    return [
      
    ];
  }

  static excludedAttr() {
    return [
      'type',   // already included
      'cap',    // captured text
      'lines',  // number of lines processed
      'n'       // number of characters captured
    ] 
  }

  static dumpAttributes() {
    return {
      def    : ['link','href','title'],
      heading: ['id','level','text']
    }
  }

}

// var Heading = class extends TreeNode {
//   constructor(node) {
//     super(node, ['id','level','text']);
//   }
// }

class MarkdownAST {
  constructor(txt) {
    this.ast = markdown.toHTML(txt, {ast:true});
    this.nodes = this.ast.map(el => new TreeNode(el));
    this.leader = '  ';
    this.children = {
      table : ['header','align','cells']
    }
  }

  dump() {
    let out = [];
    this.tree.forEach(el => {
      out = out.concat(this._dumpNode(el))
    })
    return out.join('\n')
  }

  _dumpNode(el, indent=0) {
    let hdr = this.leader.repeat(indent);

    let attr = Object.keys(el)
      .filter(x => ![
          'type',
          'cap',    // captured text
          'text',
          'lines',  // number of lines processed
          'n'       // number of characters captured
        ].includes(x)
      )
      .map(x => `${x}="${el[x]}"`);

    let txt=[]
    if (Array.isArray(el.text)) {
      el.text.forEach(t => {
        txt = txt.concat(this._dumpNode(t, indent+1))
      })
    } else if (el.text) {
      txt = txt.concat(el.text.split(/\n/g).map(txt => this.leader+hdr+txt))
    }

    return [
      `${hdr}<${el.type} ${attr.join(' ')}>`
    ].concat(txt).concat([
      `${hdr}</${el.type}>`
    ]).map(x => hdr + x)
  }
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

  // return the AST associated with markdown text
  toAST(txt) {
    return new MarkdownAST(txt)
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

    // create a table of contents
    var toc = markdown.toHTML(this.extractTOC($el));

    // convert anchors to data-href attributes
    toc = toc.replace(/href/g, 'href="#" data-href');

    // fill TOC elements
    $el.find('toc').html(toc.replace(/ul>/g, 'ol>'));

    // remove line number tags from TOC entries
    $el.find('toc [data-source-line]').each(function(){
      $(this).attr('data-source-line', null)
    });

    // style tables
    $el.find('table').addClass('table table-striped table-hover table-condensed');
    $el.find('thead').addClass('btn-primary');

    // perform syntax highlighting
    if (typeof hljs !== 'undefined') {
      $el.find('pre code').each(function(i, block) { hljs.highlightBlock(block); });
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
      return spaces + "* ["+$(this).html()+"](#"+$(this).attr('id')+")";
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


////////////////////////////
// SCROLL SYNCHRONIZATION //
////////////////////////////

/** 
 * Markdown scroll synchronization handler class
 * @param cm CodeMirror Instance
 * @param $el Rendered markdown container (wrapped in JQuery)
 * @param $toc Table of contents container (wrapped in JQuery)
 * 
 * This is a class to synchronize scroll positions between markdown source in
 * CodeMirror and a rendered markdown preview window.  It can also indicate
 * the preview window scroll location in the paired table of contents.  Either
 * the CodeMirror instance or the table of contents can be undefined.
*/

class ScrollSync {

  constructor(cm, $el, $toc) {

    // attach inputs
    this.cm   = cm;   // CodeMirror instance
    this.$el  = $el;  // Rendered markdown container
    this.$toc = $toc; // Synchronized table of contents

    // line number lookup array
    this.lineMap = null;

    // heading location lookup array
    this.headingLookup = null;

    // counters for number of triggered scroll actions.  this lets the scrolled
    // window know that its scrolling was triggered by a user scroll in the other
    // window.  otherwise there is a circular dependency and the windows fight with
    // each other
    this.scrollState = {
      editorCount : 0,
      viewerCount : 0
    };

    // don't generate debugging data
    this.debug = false;

    // reference to this for callbacks
    var _this = this;

    // initialize scroll sync data
    this.refresh();

    // bind to CodeMirror scroll event: scroll preview window to editor location
    if (this.cm) {
      this.cm.off('scroll');
      this.cm.on('scroll',
        _.debounce(
          function(){ _this.scrollTo(_this.visibleLines().top); },
          100,
          {maxWait:100}
        )
      );
    }

    // bind to rendered markdown scroll event: scroll editor window to preview location
    this.$el.off('scroll').on('scroll',
      _.debounce(
        function(){ _this.scrollFrom($(this).scrollTop()); },
        100,
        {maxWait:100}
      )
    );
  }

  // refresh scroll sync information
  refresh() {
    var _this = this;
    var scrollTop = this.$el.scrollTop();

    // need to show preview window to get line positions
    var isHidden = !this.$el.is(':visible');
    if (isHidden) {
      this.$el.show();
    }

    // capture line numbers
    var lineRefs = this.$el.find('[data-source-line]:visible');
    var x = lineRefs.map(function(){ return parseInt($(this).attr('data-source-line')) }).toArray();
    var y = lineRefs.map(function(){ return $(this).position().top + scrollTop         }).toArray();

    // interpolate/extrapolate to create a line number lookup array
    this.lineMap = this.interpolate(x, y, 1, this.cm ? this.cm.lastLine() : null);

    // capture heading locations
    this.headingLookup = [];
    this.$el.find(':header').each( function(){
      var matchingToc = _this.$toc.find("a[data-href='#" + $(this).attr('id') + "']");
      if (matchingToc.length > 0) {
        _this.headingLookup.push([
          $(this).position().top + _this.$el.scrollTop(),
          matchingToc
        ])
      }
    });

    // hide preview window if it was previously hidden
    if (isHidden) {
      this.$el.hide();
    }

    // confirm that line numbers are properly sorted
    // note that elements from the same source line can have top positions that are out of order
    // due to span elements from the same source line that are different heights
    for (var i = 1; i < x.length; i++) {
      if (x[i] < x[i-1]) { // line numbers are out of order
        throw new Error(`line number vector failure: x[${i}] < x[${i-1}] --> ${x[i]} < ${x[i-1]}`)
      } else if (
          y[i] < y[i-1]     // top position of elements are out of order
          && x[i] != x[i-1] // elements are from different source lines
      ) {
        throw new Error(`line number vector failure: y[${i}] < y[${i-1}] --> ${y[i]} < ${y[i-1]}`)
      }
    }

    // confirm that lineMap entries are properly sorted
    for (var i = 1; i < this.lineMap.length; i++) {
      if (this.lineMap[i] < this.lineMap[i-1]) {
        throw new Error("lineMap algorithm failure!");
      }
    }

    // confirm that headingLookup entries are properly sorted
    for (var i = 1; i < this.headingLookup.length; i++) {
      if (this.headingLookup[i][0] < this.headingLookup[i-1][0]) {
        throw new Error("headingLookup algorithm failure!");
      }
    }
  }

  // function to return viewer position associated with editor position
  editorPosToViewerPos(line, marker) {
    var h = this.$el.height();
    if (marker == 'bottom') {
      return this.lineMap[line-1] - h*1;
    } else if (marker == 'center') {
      return this.lineMap[line-1] - h*0.5;
    } else {
      return this.lineMap[line-1] - h*0;
    }
  }

  // function to return editor position associated with viewer position
  viewerPosToEditorPos(line) {
    var _this = this;

    // binary search function
    function binSearch(a, b, val) {
      if (b - a == 1) {
        if (_this.lineMap[b] == val) {
          return b;
        } else if (_this.lineMap[a] == val) {
          return a;
        } else {
          return a + (val - _this.lineMap[a])/(_this.lineMap[b] - _this.lineMap[a]);
        }
      } else {
        var m = Math.round((a+b)/2);
        if (val > _this.lineMap[m]) {
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
        binSearch(1, this.lineMap.length-1, line)
      )
    );
  }

  // function to return closest header to a position
  parentHeader(pos) {
    var _this = this;

    // binary search function
    function binSearch(a, b, val) {
      if (b - a == 1) {
        if (_this.headingLookup[b] == val) {
          return _this.headingLookup[b][1];
        } else if (_this.lineMap[a] == val) {
          return _this.headingLookup[a][1];
        } else {
          return _this.headingLookup[a][1];
        }
      } else {
        var m = Math.round((a+b)/2);
        if (val < _this.headingLookup[m][0]) {
          return binSearch(a, m, val);
        } else {
          return binSearch(m, b, val);
        }
      }
    }

    // perform search
    var last = this.headingLookup.length-1;
    if (last == -1) {
      return;
    } else if (pos > this.headingLookup[last][0]) {
      return this.headingLookup[last][1];
    } else {
      return binSearch(0, this.headingLookup.length-1, pos);
    }

  }


  // average adjacent points
  collapseRepeated(x_vec, y_vec) {
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
  dumpPoints(x, y, name) {
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
    this.$el.append(txt.join('<br>\n'))+'<br>\n';
  }

  // interpolate data to a linear range
  interpolate(x_in, y_in, xi, xf) {
    var out = [], x_vec = x_in.slice(), y_vec = y_in.slice(), x1, x2, y1, y2, m;
    if (this.debug) this.dumpPoints(x_vec, y_vec, 'initial');

    this.collapseRepeated(x_vec, y_vec);
    if (this.debug) this.dumpPoints(x_vec, y_vec, 'collapsed');

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
    if (this.debug) this.dumpPoints(null, out, 'interpolated');
    return out;
  }

  // scroll preview window to the location matching specified editor line number
  scrollTo(line, marker) {

    // if the update count is nonzero, this was a scroll triggered by a preview
    // window scroll (and not a user scroll).  decrement the scroll count and
    // return.
    if (this.scrollState.editorCount > 0) {
      this.scrollState.editorCount -= 1;
      return
    }

    // otherwise this was a user scroll, so trigger a corresponding scroll in the
    // preview window
    else {
      this.scrollState.viewerCount += 1;
      this.$el.scrollTop( this.editorPosToViewerPos(line,marker) );
      return
    }

  }

  // scroll editor to line number matching specified preview scroll location
  scrollFrom(line) {

    // identify closest header and corresponding TOC entry
    var matchingToc = this.parentHeader(line);

    // style closest header
    if (matchingToc) {
      this.$toc.find('li').removeClass('active visible');
      matchingToc.parent('li').addClass('active');
      matchingToc.parentsUntil(this.$toc, 'li').addClass('visible');

    }

    // if the update count is nonzero, this was a scroll triggered by an editor
    // window scroll (and not a user scroll).  decrement the scroll count and
    // return
    if (this.scrollState.viewerCount > 0) {
      this.scrollState.viewerCount -= 1;
      return
    }

    // otherwise this was a user scroll, so trigger a corresponding scroll in the
    // editor window
    else {
      this.scrollState.editorCount += 1;
      if (this.cm)
        this.cm.scrollTo(null, this.cm.heightAtLine(this.viewerPosToEditorPos(line)-1, 'local'));
      return
    }
  }

  // return locations of lines in editor window
  visibleLines(){
    var scrollInfo = this.cm.getScrollInfo();
    var topLine    = this.cm.lineAtHeight(scrollInfo.top                          , 'local');
    var bottomLine = this.cm.lineAtHeight(scrollInfo.top + scrollInfo.clientHeight, 'local');
    var maxLine    = this.cm.lineCount() - 1;
    return {
      top:    topLine,
      bottom: Math.min(maxLine, bottomLine),
      cursor: Math.min(maxLine, this.cm.getCursor().line)
    }
  }
}

