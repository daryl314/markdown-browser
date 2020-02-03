
class CmarkNode {

    constructor(pointer) {
        this._ref = pointer;
    }
  
    get type() {
        return cmark.node_type(this._ref);
    }
  
    get children() {
        let child = cmark.node_first_child(this._ref);
        let children = [];
        while (child != 0) {
            children.push(new CmarkNode(child));
            child = cmark.node_next(child);
        }
        return children;
    }
  
    get position() {
        return {
            'r1': cmark.node_start_line(this._ref), 
            'c1': cmark.node_start_column(this._ref),
            'r2': cmark.node_end_line(this._ref), 
            'c2': cmark.node_end_column(this._ref)
        }
    }
  
    get attr() {
        let tag = this.type;
        let a = {};
        if (['text', 'code_block', 'code', 'html_block', 'html_inline', 'latex_block', 'latex_inline'].includes(tag)) {
            a.Text = cmark.node_literal(this._ref);
        }
        if (tag == 'heading') a.Level = cmark.node_heading_level(this._ref); 
        if (tag == 'code_block') a.Info = cmark.node_fence_info(this._ref);
        if (tag == 'table') {
            let align_ptr = cmark.table_alignments(this._ref);
            a.Alignment = []
            let child = cmark.node_first_child(this._ref);
            while (child != 0) {
                let c = String.fromCharCode(Module.getValue(align_ptr++, 'i8'));
                a.Alignment.push({'l': 'Left', 'c': 'Center', 'r': 'Right'}[c] || 'Left');
                child = cmark.node_next(child);
            }
        } 
        if (['link', 'image'].includes(tag)) {
            a.Destination = cmark.node_url(this._ref);
            a.Title = cmark.node_title(this._ref);
        }
        if (tag == 'list') {
            a.Type = ['None', 'Bullet', 'Ordered'][cmark.node_list_type(this._ref)];
            a.Tight = cmark.node_list_tight(this._ref) != 0;
            if (a.Type == 'Ordered') {
            a.Start = cmark.node_list_start(this._ref);
            a.Delim = ["None", "Period", "Paren"][cmark.node_list_delim(this._ref)];
            }
        }
        return a;
    }
  
    toYAML() {
        return this.toAST().toYAML();
    }
  
    toAST() {
        return CmarkNode._toAST(this)
    }
  
    static _toAST(node) {
        let tag = node.type;
        let attr = node.attr;
        attr.children = new ArrayContainer();
        node.children.map(CmarkNode._toAST).forEach(c => {attr.children.push(c)});
        attr.position = new ObjectContainer('position', node.position);
        if (tag == 'table') {
            let align = attr.Alignment;
            attr.Alignment = new ArrayContainer();
            align.forEach(a => {attr.Alignment.push(a)});
        }
        return new ObjectContainer(node.type, attr);
    }
}
  
function md_to_ast(md) {
    let document = new CmarkNode(md_to_document(md));
    let ast = document.toAST();
    $('body').append(`<pre>\n${document.toYAML()}\n</pre>`)
}
  
// create accessor functions once webassembly is ready
Module.onRuntimeInitialized = _ => {
    window.md_to_html_str = Module.cwrap('md_to_html', 'string', ['string']);
    window.md_to_document = Module.cwrap('string_to_document', 'number', ['string']);
    window.cmark = {
        'node_type'         : Module.cwrap('cmark_node_get_type_string'               , 'string', ['number']),
        'node_first_child'  : Module.cwrap('cmark_node_first_child'                   , 'number', ['number']),
        'node_next'         : Module.cwrap('cmark_node_next'                          , 'number', ['number']),
        'node_start_line'   : Module.cwrap("cmark_node_get_start_line"                , 'number', ['number']),
        'node_start_column' : Module.cwrap("cmark_node_get_start_column"              , 'number', ['number']),
        'node_end_line'     : Module.cwrap("cmark_node_get_end_line"                  , 'number', ['number']),
        'node_end_column'   : Module.cwrap("cmark_node_get_end_column"                , 'number', ['number']),
        'node_literal'      : Module.cwrap("cmark_node_get_literal"                   , 'string', ['number']),
        'node_heading_level': Module.cwrap("cmark_node_get_heading_level"             , 'number', ['number']),
        'node_fence_info'   : Module.cwrap("cmark_node_get_fence_info"                , 'string', ['number']),
        'node_url'          : Module.cwrap("cmark_node_get_url"                       , 'string', ['number']),
        'node_title'        : Module.cwrap("cmark_node_get_title"                     , 'string', ['number']),
        'node_list_type'    : Module.cwrap("cmark_node_get_list_type"                 , 'number', ['number']),
        'node_list_tight'   : Module.cwrap("cmark_node_get_list_tight"                , 'number', ['number']),
        'node_list_start'   : Module.cwrap("cmark_node_get_list_start"                , 'number', ['number']),
        'node_list_delim'   : Module.cwrap("cmark_node_get_list_delim"                , 'number', ['number']),
        'table_alignments'  : Module.cwrap("cmark_gfm_extensions_get_table_alignments", 'number', ['number'])
    };
    console.log(md_to_html_str('foo'));
    md_to_ast(`
* This ~was~ **is** a list
* A
* SubA
* SubB
* B

| Heading 1 | Centered Column | Right Column |
|-----------|:---------------:|-------------:|
| Cell 1.1  | Cell 1.2        | Cell 1.3     |
| Cell 2.1  | Cell 2.2        | Cell 2.3     |

## Example loose list ##

+ A list is loose if any of its constituent list items are separated by blank lines, 
or if any of its constituent list items directly contain two block-level elements 
with a blank line between them. Otherwise a list is tight. 
(The difference in HTML output is that paragraphs in a loose list are wrapped in \`<p>\` tags, 
while paragraphs in a tight list are not.)
+ This is an item with two blocks

\`\`\`
inline code
\`\`\`
+ This is a boring item
+ This is an item with a blank line after it

+ This is the last list item

# First-level **bolded _and italicized_** heading

Paragraph text with a <a href="#">**link**</a>, \`// with some code\`,
with some __bold__ and *italic* text
with some ~~deleted~~ text

for (int i = 0; i < 10; i++) {
    // do stuff
}

Blah...

[foo][bar]
[bar][baz]

[bar]: www.google.com
    `);
};
  
// promise to wait for cmark functions
function waitForCmark() {
    return new Promise(function (resolve, reject) {
        (function waitForCmarkInner(){
            if (window.cmark) return resolve();
            setTimeout(waitForCmarkInner, 30);
        })();
    });
}