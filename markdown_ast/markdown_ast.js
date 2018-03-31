// placeholder for data
if (typeof window !== 'undefined') {
  window.markdown_ast = {};
} else {
  global.markdown_ast = {};
}

//////////////////////////////
// SELF-REPORTING CONTAINER //
//////////////////////////////

class ObjectContainer {
  constructor(name, data={}) {
    this.__name__ = name;
    Object.keys(data).forEach(key => {
      this[key] = data[key];
    })
  }

  toYAML(indent=4) {
    return this._toYAML(indent).join('\n')    
  }

  _toYAML(indent) {
    let out = [], attr = [], nested = [];
    Object.keys(this).forEach(k => {
      let v = this[k];
      if (v instanceof ObjectContainer) {
        let data = v._toYAML(indent);
        nested = nested.concat([k+':'].concat(data.map(x => ' '.repeat(indent) + x)));
      } else if (v instanceof ArrayContainer) {
        let data = v._toYAML(indent, false);
        nested = nested.concat([k+': !'+v[0]].concat(data.map(x => ' '.repeat(indent) + x)));
      } else if (k !== '__name__') {
        attr.push(`${k}: ${JSON.stringify(v)}`);
      }
    });
    // collapse if all attr...
    if (nested.length == 0) {
      return [`!${this.__name__} { ${attr.join(', ')} }`]
    } else {
      return ['!'+this.__name__].concat(attr).concat(nested);
    }
  }
}

class ArrayContainer extends Array {
  constructor(name) {
    super();
    this.push(name);
  }

  toYAML(indent=4) {
    return this._toYAML(indent).join('\n')
  }

  _toYAML(indent, withType=true) {
    let out = withType ? ['!'+this[0]] : [];
    this.slice(1).forEach(x => {
      if (x instanceof ObjectContainer || x instanceof ArrayContainer) {
        let data = x._toYAML(indent);
        out = out.concat([`- ${data[0]}`].concat(data.slice(1).map(x => ' '.repeat(indent) + x)));
      } else {
        out.push(`- ${JSON.stringify(x)}`);
      }
    });
    return out
  }
}

////////////////////////////////////
// CLASS TO DEFINE A GRAMMAR RULE //
////////////////////////////////////

// subclass regexp to customize behavior?  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/@@match

class ResultArray {
  constructor(name, arr, cap) {
    this.name = name;
    this.arr = arr;
    this.cap = cap;
  }

  toObject() {
    let out = new ArrayContainer(this.name);
    this.arr.forEach(x => {out.push(x.toObject())});
    return out
  }

  toJSON() {
    return JSON.stringify(this.toObject());
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
              if (tokRule === undefined) {
                throw new Error('Sub_rule not found: '+this.rule.sub_rules[tok]); 
              }
            }
            this.attr[tok] = tokRule.parse(this.match[i]);
          } else {
            this.attr[tok] = this.match[i];
          }
        }
      }
    }
  }

  _rawAttr() {
    return Object.keys(this.attr).filter(k => typeof this.attr[k] === 'string' || this.attr[k] === undefined)
  }

  _nestedAttr() {
    return Object.keys(this.attr).filter(k => typeof this.attr[k] !== 'string' && this.attr[k] !== undefined)
  }

  toObject() {
    let out = new ObjectContainer(this.rule.name, {lines:this.lines});
    this._rawAttr().forEach(key => {      
      out[key] = this.attr[key] !== undefined ? this.attr[key] : null;
    });
    this._nestedAttr().forEach(key => {
      out[key] = this.attr[key].toObject();
    })
    return out;
  }

  toJSON() {
    return JSON.stringify(this.toObject())
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
    if (Array.isArray(def)) {
      this.addRules(def.reduce((obj,val) => ({ ...obj, [val[0]]: val[1]}), {}));
    } else {
      Object.keys(def).forEach(key => {
        var [re,sub_rules] = def[key];
        if (this.regex) {
          re = this.regex[re];
        }
        this.addRule(key, re, sub_rules);
      })
    }
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
    return new ResultArray(this.name, out, txt);
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
        throw new Error('No template defined for rule: '+obj.rule.name)
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
  static _templateToCode(src, pretty=false, debug=false) {
    
    // subfunction to return the location of a matching ENDIF
    function findEndIf(txt) {
      let re = /{{IF ([\s\S]*?)}}|{{ENDIF}}|{{ELSE}}/;
      let depth = 0, loc = 0, cap = null, ifCondition = null;
      let ifBlock = [], elseBlock = [];
      if (debug) console.log(`findEndIf(${txt})`);

      while(loc < txt.length) {
        cap = re.exec(txt.slice(loc));

        if (cap) {
          loc += cap.index + cap[0].length;
          if (debug) console.log(`Captured text: "${cap[0]}"; Location to ${loc}.`);
        } else {
          if (debug) console.log('Nothing captured...');
        }
        
        if (cap && cap[0].startsWith('{{IF')) {
          depth += 1;
          if (depth == 1) {
            ifBlock.push(loc);
            ifCondition = cap[1];
          }

        } else if (cap && cap[0] === '{{ENDIF}}') {
          depth -= 1;
          if (depth === 0) {
            (elseBlock.length == 0 ? ifBlock : elseBlock).push(loc - cap[0].length);
            return [
              ifCondition,
              txt.slice(ifBlock[0], ifBlock[1]),
              elseBlock.length == 0 ? '""' : txt.slice(elseBlock[0],elseBlock[1]),
              loc
            ]
          }

        } else if (cap && cap[0] === '{{ELSE}}' && depth === 1) {
          ifBlock.push(loc - cap[0].length);
          elseBlock.push(loc);

        } else {
          throw new Error('Failed to find matching {{ENDIF}}')
        }

        if (debug) console.log(`Depth = ${depth}`);

      }
      throw new Error('Failed to find matching {{ENDIF}}')
    }

    // subfunction to indent pretty printed code
    function indent(txt) {
      return txt.split('\n').map(x => '    '+x).join('\n')
    }

    // accumulated code
    var code = [];

    // variables to hold captured text
    var cap, cap2;

    // consume string
    while(src) {

      // match an IF block
      if (cap2 = src.match(/^{{IF[\s\S]*?{{ENDIF}}/)) {
        let [condition, iTxt, eTxt, n] = findEndIf(src);
        let iCode = Renderer._templateToCode(iTxt);
        let eCode = Renderer._templateToCode(eTxt);
        if (pretty) {
          code.push(`(x.${condition}\n    ?(\n    ${indent(iCode)})\n    :(\n    ${indent(eCode)})\n    )`);
        } else {
          code.push(`(x.${condition}?(${iCode}):(${eCode}))`);
        }
        cap = [ src.slice(0,n) ];
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
    return code.join(pretty ? '\n    + ' : '+');
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
  static convertTemplate(src, pretty=false, debug=false) {
    var fx = 
      ( src.match(/{{\^/) // add escape function if there is any escaping in template
        ? 'function '+Renderer._functionToCode(Renderer.escape) 
        : ''
      ) + (src.match(/{{@/) // add mangle function if there is any mangling in the template
        ? 'function '+Renderer._functionToCode(Renderer.mangle)
        : ''
      ) + 'return '+Renderer._templateToCode(src.replace(/'/g,"\\'"), pretty, debug);
    if (debug) console.log(fx);
    return new Function('x', fx);
  }
}

//////////////////////////
// DEFINE REGEX GRAMMAR //
//////////////////////////

// compile regex grammar
let regex_md = function(){

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

  // non-captured version to match marked.js
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

  // version with captured text
  regex.tag1 = new RegExp(`^(${regex.tag.source.slice(1)})`);
  regex.tag1.tokens = ['text'];

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
  regex_md  // regex definition map
);

// base-level block rules
//<Rule Name>      <Regex Name>   <Sub Rules>
Model.addRules({
  BlockCode      : ['b_code'    , {}             ],
  Fences         : ['fences'    , {}             ],
  Heading        : ['heading'   , {text:'Inline'}],
  NoPipeTable    : ['nptable'   , {}             ],
  LineHeading    : ['lheading'  , {text:'Inline'}],
  HorizontalRule : ['hr'        , {}             ],
  BlockQuote     : ['blockquote', {}             ],
  List           : ['list'      , {}             ],
  HTML           : ['html'      , {}             ],
  Definition     : ['def'       , {}             ],
  Table          : ['table'     , {}             ],
  Paragraph      : ['paragraph' , {text:'Inline'}],
  BlockText      : ['b_text'    , {text:'Inline'}]
});

// 'Block' rule is repeated dispatch over block types
Model.addDispatchRule('BlockElement', 
  'BlockCode|Fences|Heading|NoPipeTable|LineHeading|HorizontalRule|BlockQuote|List|' +
  'HTML|Definition|Table|Paragraph');
Model.addRepeatingRule('Block', 'BlockElement');

// 'ListBlock' rule is used in list processing (or when processing a list and a block quote)
Model.addDispatchRule('ListBlockElement', 
'BlockCode|Fences|Heading|LineHeading|HorizontalRule|BlockQuote|List|HTML|BlockText');
Model.addRepeatingRule('ListBlock', 'ListBlockElement');

// 'QuoteBlock' rule is used when processing block quotes (but not lists)
Model.addDispatchRule('QuoteBlockElement', 
  'BlockCode|Fences|Heading|NoPipeTable|LineHeading|HorizontalRule|BlockQuote|List|' +
  'HTML|Table|Paragraph');
Model.addRepeatingRule('QuoteBlock', 'QuoteBlockElement');


// base-level inline rules
Model.addRules({
  InlineLatex   : ['i_latex'  , {}             ],
  BlockLatex    : ['b_latex'  , {}             ],
  Escape        : ['escape'   , {}             ],
  AutoLink      : ['autolink' , {}             ],
  URL           : ['url'      , {}             ],
  Tag           : ['tag1'     , {}             ],
  Link          : ['link'     , {text:'Inline'}],
  ReferenceLink : ['reflink'  , {}             ],
  NoTextRefLink : ['nolink'   , {}             ],
  StrongUs      : ['strong_us', {text:'Inline'}],
  StrongAs      : ['strong_as', {text:'Inline'}],
  EmUs          : ['em_us'    , {text:'Inline'}],
  EmAs          : ['em_as'    , {text:'Inline'}],
  InlineCode    : ['i_code'   , {}             ],
  Break         : ['br'       , {}             ],
  Del           : ['del'      , {text:'Inline'}],
  InlineText    : ['i_text1'  , {}             ]
});

// 'Inline' rule is repeated dispatch over inline types
Model.addDispatchRule('InlineElement', 
  'InlineLatex|BlockLatex|Escape|AutoLink|URL|Tag|Link|ReferenceLink|NoTextRefLink|' +
  'StrongUs|StrongAs|EmUs|EmAs|InlineCode|Break|Del|InlineText'
);
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
// {{myField}} ..................... insert input.myField
// {{^myField}} .................... insert escaped html input.myField
// {{^^myField}} ................... insert escaped text input.myField
// {{@myField}} .................... insert mangled text input.myField
// {{IF expr}}A{{ENDIF}} ........... if expr is true, insert "A"
// {{IF expr}}A{{ELSE}}B{{ENDIF}} .. if expr is true, insert "A", otherwise insert "B"

let sourceLine = '{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}';
renderer = new Renderer({
   Heading      : `<h{{level}}${sourceLine} id="{{id}}">{{text}}</h{{level}}>\n`,
   BlockCode    : `<pre${sourceLine}><code{{IF lang}} class="lang-{{lang}}"{{ENDIF}}>{{^^code}}\n</code></pre>{{IF lang}}\n{{ENDIF}}`,
   Paragraph    : `<p${sourceLine}>{{text}}</p>\n`,
   AutoLinkLink : `<a${sourceLine} href="{{^href}}">{{^href}}</a>`, 
   AutoLinkMail : `<a${sourceLine} href="mailto:{{^href}}">{{href}}</a>`,
   URL          : `<a${sourceLine} href="{{^href}}">{{href}}</a>`, 
   Hyperlink    : `<a${sourceLine} {{options}}>{{text}}</a>`,
   ReferenceLink: `{{IF xhref}}<a${sourceLine} href="{{^xhref}}"{{IF title}} title="{{^title}}"{{ENDIF}}>{{text}}</a>{{ELSE}}[{{text}}][{{title}}]{{ENDIF}}`,
   StrongUs     : `<strong${sourceLine}>{{text}}</strong>`,
   StrongAs     : `<strong${sourceLine}>{{text}}</strong>`,
   EmUs         : `<em${sourceLine}>{{text}}</em>`,
   EmAs         : `<em${sourceLine}>{{text}}</em>`,
   InlineCode   : `<code${sourceLine}>{{^^text}}</code>`,
   Break        : `<br${sourceLine}/>`,
   Del          : `<del${sourceLine}>{{text}}</del>`,
   InlineText   : `{{^text}}`,
   Escape       : `{{text}}`,
   Definition   : ''
});

//
inlineRulesLink.map(x => x[0]).filter(x => x !== 'URL' && x.endsWith('URL')).forEach(name => {
  renderer.rules[name] = renderer.rules[name.slice(0,-3)];
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
