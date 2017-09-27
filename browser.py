#!/usr/bin/env python
import curses
import curses.panel
import sys
import re
import time
import math
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

    def __init__(self, tagIterator, html):
        self.tags = tagIterator  # iterator for Tag objects
        self.inhtml = html       # associated html
        self.children = []       # children of tag pair
        self.leftTag = None      # left tag in pair
        self.opt = None          # options associated with left tag
        self.rightTag = None     # right tag in pair
        self.end = None          # position of right side of tag in html

        # opening tag in pair is first tag in queue
        self.leftTag = self.tags.popleft()
        self.opt = self.leftTag.opt

        # if tag is self-closing, there is no closing tag
        if self.leftTag.isSelfClosing:
            self.rightTag = None
            self.end = self.leftTag.end

        # otherwise search for the closing tag
        else:

            # search for closing tag.  everything until the closing tag is
            # a child of the current tag pair
            while self.tags[0].tag != self.leftTag.tag:
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
        if len(txt) > 0:
            self.children.append(txt)

    def position(self):
        """Return the index of the most recently consumed tag"""
        lastTag = self.children[-1] if len(self.children) > 0 else self.leftTag
        return lastTag.end

    def html(self):
        """Return an HTML representation of the tag pair"""
        opt = ''.join([' %s="%s"'%x for x in self.leftTag.opt.items()]) 
        if self.leftTag.isSelfClosing:
            left = "<" + self.leftTag.tag + opt + "/>"
            inner = ''
            right = ''
        else:
            left = "<" + self.leftTag.tag + opt + ">"
            right = "</" + self.leftTag.tag + ">"
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
        return self.leftTag.tag == tag

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
        self.data = []
        self._parse(el.children, [el.leftTag.tag])

    def _parse(self, children, tagStack):
        for child in children:
            if isinstance(child, str):
                self.data.append((tagStack, child))
            else:
                newTag = child.leftTag.tag
                self._parse(child.children, tagStack+[newTag])

    def __len__(self):
        if len(self.data) == 0:
            return 0
        else:
            return sum([len(x[1]) for x in self.data]) + len(self.data) - 1

    def padTo(self, n):
        if len(self.data) == 0:
            self.data.append(([], ' '*n))
        else:
            self.data[-1] = (self.data[-1][0], self.data[-1][1] + ' '*(n-len(self)))
        return self

class Renderer:

    PassthroughTags = {
        'h1','h2','h3','h4','h5','h6',
        'p', 'pre'
    }

    def __init__(self, lineWidth):
        self.lineData = []
        self.lineWidth = lineWidth
        self.curLine = []
        self.curSpace = lineWidth

    def render(self, container):    
        for el in container.children:
            if isinstance(el,TagPair):
                tag = el.leftTag.tag
                if tag != 'toc':
                    if tag in self.PassthroughTags:
                        inline = InlineData(el)
                        for inlineChild in inline.data:
                            self.append(inlineChild[1], inlineChild[0])
                        self.newline(2)
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

    def parseInline(self, children, tagStack, indent=0):
        for child in children:
            if isinstance(child, str):
                self.append(child, tagStack, indent=indent)
            else:
                self.parseInline(child.children, tagStack+[child.leftTag.tag], indent)

    def parseTable(self, table):

        thead = [InlineData(th) for th in table.first('thead').first('tr')['th']]
        tbody = []
        for tr in table.first('tbody')['tr']:
            tbody.append([InlineData(td) for td in tr['td']])

        maxLen = map(len, thead)
        for tr in tbody:
            for i,td in enumerate(tr):
                maxLen[i] = max(maxLen[i], len(td))

        for tr in [thead]+tbody:
            for i,td in enumerate(tr):
                for el in td.padTo(maxLen[i]).data:
                    self.append(el[1], el[0])
            self.newline()

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
                    self.parseInline([subChild], tagStack=['li'], indent=len(leader))

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

    def dumpString(self):
        for line in self.lineData + self.curLine:
            print ' '.join([x[1] for x in line])

################################################################################
        
# convert an HTML file into tag pair data
t1 = time.time()
html = open("./syncData/html/Wiki/Python.html",'rt').read()
tags = TagPair.fromHTML(html)
t2 = time.time()
print "Parsed HTML in %.3f seconds" % (t2-t1)

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
        return colors['body']

# render html
lineData = Renderer(curses.COLS-34).render(container)

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

# add rendered html to main window
for row,line in enumerate(lineData.lineData[:curses.LINES-4]):
    col = 1
    for el in line:
        my_wins['body'].addstr(row+1, col, el[1], stackColor(el[0]))
        col += len(el[1]) + 1

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

# embed an ipython kernel (connect with ipython --existing)
#import IPython;IPython.start_kernel()

# wait for character input
stdscr.getch()
teardown()