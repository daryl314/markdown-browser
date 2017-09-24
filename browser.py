#!/usr/bin/env python
import curses
import curses.panel
import sys
import re
from collections import deque

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
        
# convert an HTML file into tag pair data
html = open("./syncData/html/Wiki/Python.html",'rt').read()
tags = TagPair.fromHTML(html)

# extract table of contents
toc = tags.first('body')['div#markdown-container'].first('toc')
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

#import IPython;IPython.embed()
#sys.exit()        

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
    ('header', 'black'      , 'lightsalmon'),
    ('footer', 'black'      , 'wheat'      ),
    ('toc'   , 'deepskyblue', 'black'      )
]

# configure colors
colors = configColors(color_config)

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