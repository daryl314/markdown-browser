#!/usr/bin/env python
import curses
import curses.panel
import sys
import os
import re
import time
import math
import logging
import cStringIO
from collections import deque
from os import abort

import TerminalColors256

# Resources
#   - http://www.tldp.org/HOWTO/NCURSES-Programming-HOWTO/
#   - https://docs.python.org/2/howto/curses.html
#   - https://docs.python.org/2/library/curses.html
#   - https://docs.python.org/2/library/curses.panel.html

# Debugging with iPython:
#   - in first shell: `ipython kernel`
#   - in second shell: `jupyter console --existing`
#   - in iPython in second shell:
#     import os
#     os.environ['TERM'] = 'screen-256color'
#     run browser.py



# TODO: have popups with rendered latex from terminal browsing application

logging.basicConfig(filename='browser.log', level=logging.INFO, filemode='wt')

################################################################################

class ParserHelpers:
    """Container class for parsing helper functions"""

    # HTML regexes
    TagProperty = re.compile('\\s*(\\w+)+\\s*=\\s*(\'.*?\'|".*?")')
    Tag = re.compile(r'<\s*(\/?)\s*(\w+)(.*?)(\/?)>')

    @staticmethod
    def parseTagOptions(opt):
        """Convert tag options to a dict"""
        return dict([(x[0],x[1][1:-1]) for x in ParserHelpers.TagProperty.findall(opt)])

################################################################################

class Tag:
    """Representation of an HTML tag"""

    def __init__(self, match):
        lClose,tag,opt,rClose = match.groups()
        self.tag = tag
        self.isClosingTag = lClose == '/'
        self.isSelfClosing = rClose == '/'
        self.start = match.start()
        self.end = match.end()
        self.opt = ParserHelpers.parseTagOptions(opt)

    def __repr__(self):
        return self.tag + self.opt.__repr__()

################################################################################

class TagPair:
    """Representation of a pair of HTML tags and their inner content"""

    def __init__(self, tagIterator, html, unescape=True):
        self.tags = tagIterator  # iterator for Tag objects
        self.inhtml = html       # associated html
        self.children = []       # children of tag pair
        self.leftTag = None      # left tag in pair
        self.opt = None          # options associated with left tag
        self.tag = None          # type of tag pair
        self.rightTag = None     # right tag in pair
        self.end = None          # position of right side of tag in html
        self.unescape = unescape # should escaped text be converted?

        # opening tag in pair is first tag in queue
        self.leftTag = self.tags.popleft()
        self.opt = self.leftTag.opt
        self.tag = self.leftTag.tag

        # if tag is self-closing, there is no closing tag
        if self.leftTag.isSelfClosing:
            self.rightTag = None
            self.end = self.leftTag.end

        # otherwise search for the closing tag
        else:

            # search for closing tag.  everything until the closing tag is
            # a child of the current tag pair
            while self.tags[0].tag != self.tag:
                self.pushText()
                self.pushTag()
            assert self.tags[0].isClosingTag

            # consume any text between last child and closing tag
            self.pushText()

            # attach closing tag and its position in input html
            self.rightTag = self.tags.popleft()
            self.end = self.rightTag.end

    def pushTag(self):
        """Add a tag pair to list of children"""
        self.children.append(TagPair(self.tags, self.inhtml))

    def pushText(self):
        """Add text to list of children"""
        txt = self.inhtml[ self.position() : self.tags[0].start ].lstrip().rstrip()
        if self.unescape:
            txt = txt\
                .replace('&apos;' , "'" )\
                .replace('&#39;'  , "'" )\
                .replace('&quot;' , '"' )\
                .replace('&gt;'   , '>' )\
                .replace('&lt;'   , '<' )\
                .replace('&amp;'  , '&' )
        if len(txt) > 0:
            self.children.append(txt)

    def position(self):
        """Return the index of the most recently consumed tag"""
        lastTag = self.children[-1] if len(self.children) > 0 else self.leftTag
        return lastTag.end

    def html(self):
        """Return an HTML representation of the tag pair"""
        opt = ''.join([' %s="%s"'%x for x in self.opt.items()])
        if self.leftTag.isSelfClosing:
            left = "<" + self.tag + opt + "/>"
            inner = ''
            right = ''
        else:
            left = "<" + self.tag + opt + ">"
            right = "</" + self.tag + ">"
        return left + inner + right

    def first(self,key):
        """Return first matching child"""
        matches = self.__getitem__(key)
        if len(matches) > 0:
            return matches[0]
        else:
            return None

    def isType(self, tag):
        """Return true if tag pair is of specified type"""
        return self.tag == tag

    def hasID(self, id):
        """Return true if tag pair has specified ID"""
        return 'id' in self.opt and self.opt['id'] == id

    def __getitem__(self,key):
        """Return a matching child"""
        if '#' in key:
            tag,id = key.split('#',1)
            return [c for c in self.children if isinstance(c,TagPair) and c.isType(tag) and c.hasID(id)][0]
        else:
            return [c for c in self.children if isinstance(c,TagPair) and c.isType(key)]

    def __repr__(self):
        """String representation of TagPair"""
        txt = [self.leftTag.__repr__()]
        for i,c in enumerate(self.children):
            if isinstance(c,TagPair):
                s = c.leftTag.__repr__()
            else:
                if len(c) > 74:
                    c = c[:70] + ' ...'
                s = c.__repr__()
            txt.append('  %d: %s'%(i,s))
        return '\n'.join(txt)

    @staticmethod
    def fromHTML(html):
        """Convert an html string into a TagPair"""
        if html.startswith('<!DOCTYPE html>'):
            html = re.sub(r'<!DOCTYPE html>\s*', '', html)
        tags = deque(Tag(m) for m in ParserHelpers.Tag.finditer(html))
        return TagPair(tags, html)

################################################################################

class InlineData:
    """Container class for parsed inline HTML data"""

    def __init__(self, el):
        self.data = [[]]
        if el is not None:
            self._parse(el.children, [el.tag])

    @staticmethod
    def fromChild(child, tagStack=[]):
        return InlineData(None)._parse([child], tagStack)

    def _parse(self, children, tagStack):
        for child in children:
            if isinstance(child, str):
                logging.info("Processing child: " + child.__repr__())
                for n,line in enumerate(child.split('\n')):
                    if n > 0:
                        self._newline()
                    self._append(tagStack, line)
            else:
                self._parse(child.children, tagStack+[child.tag])
        return self

    def _append(self, tagStack, txt):
        self.data[-1].append((tagStack, txt))

    def _newline(self):
        self.data.append([])

    def __len__(self):
        if len(self.data[0]) == 0:
            return 0
        else:
            return max([self.rowLen(n) for n in range(len(self.data))])

    def __iter__(self):
        return iter(self.data)

    def rowLen(self, n):
        row = self.data[n]
        return sum([len(txt) for _, txt in row]) + len(row) - 1

    def getRow(self, n):
        out = InlineData(None)
        if n < len(self.data):
            out.data = [self.data[n]]
        else:
            out.data = [([], '')]

    def padTo(self, n):
        if len(self.data[0]) == 0:
            self.data[0].append(([], ' '*n))
        else:
            for row in range(len(self.data)):
                ts,txt = self.data[row][-1]
                txt += ' '*(n-self.rowLen(row))
                self.data[row] = self.data[row][:-1] + [(ts,txt)]
        return self

  # var render_templates = {
  #   space:      '',
  #   hr:         '<hr{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}/>\n',
  #   heading:    '<h{{level}} id="{{id}}"{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</h{{level}}>\n',
  #   b_code:     '<pre{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}><code{{IF lang}} class="lang-{{lang}}"{{ENDIF}}>{{^^code}}\n</code></pre>{{IF lang}}\n{{ENDIF}}',
  #   blockquote: '<blockquote{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>\n{{text}}</blockquote>\n',
  #   html:       '{{text}}',
  #   list:       '<{{listtype}}{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>\n{{text}}</{{listtype}}>\n',
  #   listitem:   '<li{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</li>\n',
  #   paragraph:  '<p{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</p>\n',
  #   b_text:     '<p{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</p>\n',
  #   table:      '<table{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>\n<thead>\n{{header}}</thead>\n<tbody>\n{{body}}</tbody>\n</table>\n',
  #   tablerow:   '<tr{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>\n{{content}}</tr>\n',
  #   tablecell:  '<{{IF header}}th{{ELSE}}td{{ENDIF}}{{IF align}} style="text-align:{{align}}"{{ENDIF}}{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</{{IF header}}th{{ELSE}}td{{ENDIF}}>\n',
  #   strong:     '<strong{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</strong>',
  #   em:         '<em{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</em>',
  #   i_code:     '<code{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{^^text}}</code>',
  #   i_text:     '{{^text}}',
  #   i_html:     '{{text}}',
  #   br:         '<br{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}/>',
  #   del:        '<del{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</del>',
  #   link:       '<a href="{{^href}}"{{IF title}} title="{{^title}}"{{ENDIF}}{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{text}}</a>',
  #   mailto:     '<a href="{{@href}}"}{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{@text}}</a>',
  #   image:      '<img src="{{^href}}" alt="{{^text}}"{{IF title}} title="{{^title}}"{{ENDIF}}{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}/>',
  #   tag:        '<{{IF isClosing}}/{{ENDIF}}{{text}}{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}{{IF selfClose}}/{{ENDIF}}>',
  #   i_latex:    '<latex class="inline"{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{latex}}</latex>',
  #   b_latex:    '<latex class="block"{{IF sourceLine}} data-source-line="{{sourceLine}}"{{ENDIF}}>{{latex}}</latex>'
  # }

class Renderer:

    PassthroughTags = {
        'h1','h2','h3','h4','h5','h6',
        'p', 'pre'
    }

    def __init__(self, lineWidth=80):
        self.lineData = []
        self.lineWidth = lineWidth
        self.curLine = []
        self.curSpace = lineWidth

    def render(self, container):    
        for el in container.children:
            if isinstance(el,TagPair):
                tag = el.leftTag.tag
                logging.info('Parsing tag: %s' % tag)
                if tag != 'toc':
                    if tag in self.PassthroughTags:
                        for inlineRow in InlineData(el):
                            for tagstack,txt in inlineRow:
                                self.append(txt, tagstack)
                            self.newline()
                        self.newline(1)
                    elif tag in ['ul','ol']:
                        self.parseList(el, indent=0)
                        self.newline()
                    elif tag == 'table':
                        self.parseTable(el)
                        self.newline()
                    else:
                        raise RuntimeError("Unrecognized element: "+tag)
                        print "Uncrecognized element:", tag
                        import IPython;IPython.embed()
            else:
                raise RuntimeError("Unexpected raw text")
        self.newline()
        return self

    def parseTable(self, table):

        # extract cell data
        thead = self.parseTableRow(table.first('thead').first('tr')['th'])
        tbody = []
        for tr in table.first('tbody')['tr']:
            tbody += self.parseTableRow(tr['td'])

        # calculate max length for each column
        maxLen = map(len, thead[0])
        for tr in thead[1:] + tbody:
            for i,td in enumerate(tr):
                maxLen[i] = max(maxLen[i], len(td))

        for tr in thead+tbody:
            for n,td in zip(maxLen,tr):
                padded = td.padTo(n)
                assert len(padded.data) == 1
                for tagStack,txt in padded.data[0]:
                    self.append(txt, tagStack)
            self.newline()

    def parseTableRow(self, cells):
        rowData = [InlineData(td) for td in cells]
        maxRows = max([len(td.data) for td in rowData])
        if maxRows == 1:
            return [rowData]
        else:
            out = []
            for row in range(maxRows):
                out.append([td.getRow(row) for td in rowData])
            return out

    def parseList(self, el, indent=0):

        # leader format string
        if el.leftTag.tag == 'ol':
            fmt = '%%%dd. ' % int(math.ceil(math.log10(len(el.children))))

        # iterate over child <li> elements
        for i,child in enumerate(el.children):
            assert isinstance(child,TagPair) and child.leftTag.tag == 'li'

            # start rendered <li> with bullet
            if el.leftTag.tag == 'ul':
                leader = '  ' * indent + '* '
            else:
                leader = '  ' * indent + fmt%i
            self.append(leader, ['li'])

            # iterate over <li> components
            for subChild in child.children:

                # if a <ul> is found, start a nested list at next indent level
                if isinstance(subChild,TagPair) and subChild.leftTag.tag in ['ul','ol']:
                    self.newline()
                    self.parseList(subChild, indent=indent+1)

                # otherwise...
                else:
                    for [inlineChild] in InlineData.fromChild(subChild, tagStack=['li']).data:
                        self.append(inlineChild[1], inlineChild[0], indent=len(leader))
                    # self.newline()

            # newline after list item.  indentation for next item is handled above.  if <li> ended with an
            # embedded <ul>, newline is handled by inner list's terminal <li>
            if not isinstance(child.children[-1],TagPair) or child.children[-1].leftTag.tag not in ['ul','ol']:
                self.newline()

    def sol(self):
        return self.curSpace == self.lineWidth

    def eol(self):
        return self.curSpace == 0

    def newline(self, count=1, indent=0):
        self.lineData.append(self.curLine)
        for i in range(1, count):
            self.lineData.append( [] )
        if indent == 0:
            self.curLine = []
            self.curSpace = self.lineWidth
        else:
            self.curLine = [([], ' '*indent)]
            self.curSpace = self.lineWidth - indent

    def append(self, txt, styles, indent=0):
        if len(txt) <= self.curSpace:
            self.curLine.append((styles,txt))
            self.curSpace -= len(txt)
        else:
            head,tail = txt[:self.curSpace],txt[self.curSpace:]
            self.curLine.append((styles,head))
            self.newline(indent=indent)
            self.append(tail,styles)

    def dumpString(self, withLines=False):
        buf = cStringIO.StringIO()
        for i,line in enumerate(self.lineData + self.curLine):
            lineData = ' '.join([txt for _,txt in line])
            if withLines:
                buf.write('%d: %s\n' % (i, lineData))
            else:
                buf.write(lineData + '\n')
        return buf.getvalue()

################################################################################
        
# convert an HTML file into tag pair data
t1 = time.time()
html = open("./syncData/html/Wiki/Python.html",'rt').read()
tags = TagPair.fromHTML(html)
t2 = time.time()
logging.info("Parsed HTML in %.3f seconds" % (t2-t1))

# extract table of contents
container = tags.first('body')['div#markdown-container']
toc = container.first('toc')
items = toc.first('ol')['li']

# convert table of contents to list of strings to display
def renderTocItem(item, arr, indent=0):
    arr.append('**'*indent + item.first('a').children[0])
    if item.first('ol') is not None:
        for li in item.first('ol')['li']:
            renderTocItem(li, arr, indent+1)
tocRender = []
for item in items:
    renderTocItem(item, tocRender)

################################################################################

def configColors(colors):
    """Configure color data and return a dict of pairs"""
    out = {}
    for i,(k,fg,bg) in enumerate(colors):
        if isinstance(fg, str):
            fg = TerminalColors256.Color256(fg).index
        if isinstance(bg, str):
            bg = TerminalColors256.Color256(bg).index
        curses.init_pair(i+1, fg, bg)
        out[k] = curses.color_pair(i+1)
    return out

def startup():
    """Start a curses session"""

    # required for underline support in tmux
    if os.environ['TERM'] == 'screen-256color':
        os.environ['TERM'] = 'xterm-256color'

    # set up curses
    stdscr = curses.initscr()  # start curses mode
    curses.start_color()       # use colors
    curses.cbreak()            # interpret control characters normally
    curses.noecho()            # don't echo input to terminal
    stdscr.keypad(1)           # handle special keysj
    return stdscr

def teardown():
    """Terminate a curses session"""
    curses.nocbreak()
    stdscr.keypad(0)
    curses.echo()
    curses.endwin()

################################################################################

logging.info(Renderer(80).render(container).dumpString(withLines=True))

# start curses session
stdscr = startup()

# color configuration
color_config = [
    ('header'  , 'black'      , 'lightsalmon'),
    ('footer'  , 'black'      , 'wheat'      ),
    ('body'    , 'white'      , 'black'      ),
    ('toc'     , 'deepskyblue', 'black'      ),
    ('heading' , 'red'        , 'black'      ),
    ('code'    , 'pink'       , 'grey'       ),
    ('th'      , 'white'      , 'blue'       )
]

# configure colors
colors = configColors(color_config)

# return the curses style associated with a tag stack
def stackColor(tagStack):
    if len(tagStack) == 0:
        return colors['body']
    elif tagStack[0] in {'h1','h2','h3','h4','h5','h6'}:
        return colors['heading'] | curses.A_UNDERLINE
    elif tagStack[0] == 'th':
        return colors['th']
    elif 'code' in tagStack:
        return colors['code']
    else:
        return curses.A_REVERSE #colors['body']

# render html
lineData = Renderer(curses.COLS-34).render(container)
logging.info(lineData.dumpString(withLines=True))

################################################################################

# configure some windows
my_wins = {
    'header' : curses.newwin(1, curses.COLS, 0, 0),
    'nav'    : curses.newwin(curses.LINES-2, 30, 1, 0),
    'body'   : curses.newwin(curses.LINES-2, curses.COLS-30, 1, 30),
    'footer' : curses.newwin(1, curses.COLS, curses.LINES-1, 0)
}

# draw boxes around nav and body
my_wins['nav'].box(0,0)
my_wins['body'].box(0,0)

# add table of contents items to nav window
for i,item in enumerate(tocRender):
    my_wins['nav'].addstr(i+1, 1, item, colors['toc'])

# display data starting from specified line
main_height = curses.LINES - 4
def displayData(startLine=0):
    my_wins['body'].erase()
    lines = lineData.lineData[startLine : startLine+main_height]
    rows,cols = my_wins['body'].getmaxyx()
    logging.info("Window size: " + (rows,cols).__repr__())
    for row,line in enumerate(lines):
        col = 1
        for el in line:
            if col < cols:
                logging.info('Adding text at %d,%d: "%s"' % (row+1,col,el[1]))
                my_wins['body'].addstr(row + 1, col, el[1][:cols-col], stackColor(el[0]))
            else:
                logging.info('Skipping text (beyond window): "%s"' % el[1])
            col += len(el[1]) + 1
    my_wins['body'].refresh()

# placeholder text for header
my_wins['header'].hline(0, 0, ' ', curses.COLS, colors['header'])
my_wins['header'].addstr(0,0,'Menu header goes here...',colors['header'])

# placeholder text for footer
my_wins['footer'].hline(0, 0, ' ', curses.COLS, colors['footer'])
my_wins['footer'].addstr(0,0,'Menu footer goes here...',colors['footer'])

# create panels from windows
my_panels = {}
for k,v in my_wins.items():
    my_panels[k] = curses.panel.new_panel(v)
curses.panel.update_panels()

# show screen
curses.doupdate()

# scroll data on key presses
for row in range(0, len(lineData.lineData), main_height):
    if row > 0:
        stdscr.getch()
    displayData(row)

# embed an ipython kernel (connect with ipython --existing)
#import IPython;IPython.start_kernel()

# wait for character input
stdscr.getch()
teardown()