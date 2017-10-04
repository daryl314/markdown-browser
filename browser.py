#!/usr/bin/env python
import curses
import curses.panel
import sys
import os
import time
import math
import logging
import cStringIO
import argparse
from os import abort

import TerminalColors256
from TagPair import TagPair

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
# TODO: use raw ANSI escape codes instead of curses for 24-bit color
#   - http://www.lihaoyi.com/post/BuildyourownCommandLinewithANSIescapecodes.html
# TODO: put in color schemes?
#   - http://vimcolors.com/628/codedark/dark
#   - http://vimcolors.com/21/seoul256/dark
#   - http://vimcolors.com/9/zenburn/dark
#   - http://vimcolors.com/196/ir_black/dark

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

class Renderer:

    # block tags that are processed as-is
    PassthroughTags = {
        'h1','h2','h3','h4','h5','h6','p','pre','blockquote','latex'
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
                    elif tag == 'hr':
                        self.append('-'*10, ['hr'])
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

class CursesHandler:

    def __init__(self):
        pass

    def startup(self, term=None):
        """Start a curses session"""

        # set terminal environment variable
        if term is not None:
            os.environ['TERM'] = term

        # set up curses
        stdscr = curses.initscr()  # start curses mode
        curses.start_color()  # use colors
        curses.cbreak()  # interpret control characters normally
        curses.noecho()  # don't echo input to terminal
        stdscr.keypad(1)  # handle special keysj
        self.stdscr = stdscr

    def configColors(self, colors):
        """Configure color data and return a dict of pairs"""
        out = {}
        for i, (k, fg, bg) in enumerate(colors):
            if isinstance(fg, str) or fg > 16:
                fg = TerminalColors256.Color256(fg).index
            if isinstance(bg, str) or bg > 16:
                bg = TerminalColors256.Color256(bg).index
            curses.init_pair(i + 1, fg, bg)
            out[k] = curses.color_pair(i + 1)
        return out

    def teardown(self):
        """Terminate a curses session"""
        curses.nocbreak()
        self.stdscr.keypad(0)
        curses.echo()
        curses.endwin()

    # solarized color scheme
    SOLAR_BASE03 = 0x002b36  # Darkest background
    SOLAR_BASE02 = 0x073642  # 2nd darkest background
    SOLAR_BASE01 = 0x586e75  # Content darkest
    SOLAR_BASE00 = 0x657b83  # Content 2nd darkest
    SOLAR_BASE0 = 0x839496  # Content 2nd lightest
    SOLAR_BASE1 = 0x93a1a1  # Content lightest
    SOLAR_BASE2 = 0xeee8d5  # 2nd lightest background
    SOLAR_BASE3 = 0xfdf6e3  # Lightest background
    SOLAR_YELLOW = 0xb58900
    SOLAR_ORANGE = 0xcb4b16
    SOLAR_RED = 0xdc322f
    SOLAR_MAGENTA = 0xd33682
    SOLAR_VIOLET = 0x6c71c4
    SOLAR_BLUE = 0x268bd2
    SOLAR_CYAN = 0x2aa198
    SOLAR_GREEN = 0x859900

################################################################################

class Application:

    NAVWIDTH = 30

    def __init__(self):
        self.curses = CursesHandler()

    def loadFile(self, fileName):
        """Load HTML data from file"""

        # extract tag data
        t1 = time.time()
        self.tags = TagPair.fromHTML(file=fileName)
        t2 = time.time()
        logging.info("Parsed HTML in %.3f seconds" % (t2-t1))

        # extract table of contents
        self.container = self.tags.first('body')['div#markdown-container']
        self.toc = self.container.first('toc').first('ol')['li']

        # if debugging, render content to log file
        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.info(Renderer(80).render(self.container).dumpString(withLines=True))

        # placeholders
        self.windows = None
        self.panels = None

    def tocData(self):
        """Return rendered TOC data as a list"""

        # convert table of contents to list of strings to display
        def renderTocItem(item, arr, indent=0):
            arr.append('**'*indent + item.first('a').children[0])
            if item.first('ol') is not None:
                for li in item.first('ol')['li']:
                    renderTocItem(li, arr, indent+1)
        tocRender = []
        for item in self.toc:
            renderTocItem(item, tocRender)
        return tocRender

    def startCurses(self, term=None):

        self.curses.startup(term=term)
        self.colors = self.curses.configColors(self.color_config)

        self.lineData = Renderer(curses.COLS - 34).render(app.container)
        if logging.getLogger().isEnabledFor(logging.DEBUG):
            logging.info(self.lineData.dumpString(withLines=True))

        # configure windows
        self.windows = {
            'header': curses.newwin(1, curses.COLS, 0, 0),
            'nav'   : curses.newwin(curses.LINES - 2, self.NAVWIDTH, 1, 0),
            'body'  : curses.newwin(curses.LINES - 2, curses.COLS - self.NAVWIDTH, 1, self.NAVWIDTH),
            'footer': curses.newwin(1, curses.COLS, curses.LINES - 1, 0)
        }

        # draw boxes around nav and body
        self.windows['nav' ].box(0, 0)
        self.windows['body'].box(0, 0)

        # placeholder text for header and footer
        self.headerText('Menu header goes here...')
        self.footerText('Menu footer goes here...')

        # add table of contents items to nav window
        self.windows['nav'].bkgd(' ', app.colors['toc'])
        for i, item in enumerate(self.tocData()):
            self.windows['nav'].addstr(i + 1, 1, item[:28], self.colors['toc'])

        # show screen
        curses.doupdate()

        # create panels from windows
        self.panels = {}
        for k,v in self.windows.items():
            self.panels[k] = curses.panel.new_panel(v)
        curses.panel.update_panels()

    def displayData(self, startLine=0):
        main_height = curses.LINES - 4
        self.windows['body'].erase()
        self.windows['body'].bkgd(' ', app.colors['body'])
        lines = self.lineData.lineData[startLine: startLine + main_height]
        rows, cols = self.windows['body'].getmaxyx()
        logging.info("Window size: " + (rows, cols).__repr__())
        for row,line in enumerate(lines):
            col = 1
            for el in line:
                if col < cols:
                    logging.info('Adding text at %d,%d: "%s"' % (row + 1, col, el[1]))
                    self.windows['body'].addstr(row + 1, col, el[1][:cols - col], app.stackColor(el[0]))
                else:
                    logging.info('Skipping text (beyond window): "%s"' % el[1])
                col += len(el[1]) + 1
        self.windows['body'].refresh()

    def headerText(self, txt):
        self.windows['header'].hline(0, 0, ' ', curses.COLS, app.colors['header'])
        self.windows['header'].addstr(0, 0, txt, app.colors['header'])

    def footerText(self, txt):
        self.windows['footer'].hline(0, 0, ' ', curses.COLS, app.colors['footer'])
        self.windows['footer'].addstr(0, 0, txt, app.colors['footer'])

    # return the curses style associated with a tag stack
    def stackColor(self, tagStack):
        if len(tagStack) == 0:
            return self.colors['body']
        if 'em' in tagStack:
            return curses.A_UNDERLINE | self.stackColor(list(set(tagStack) - {'em'}))
        elif tagStack[0] == 'h1':
            return self.colors['h1']
        elif tagStack[0] in {'h2', 'h3', 'h4', 'h5', 'h6'}:
            return self.colors['heading'] | curses.A_BOLD
        elif tagStack[0] == 'th':
            return self.colors['th']
        elif 'code' in tagStack:
            return self.colors['code']
        elif 'a' in tagStack or 'img' in tagStack:
            return self.colors['a'] | curses.A_UNDERLINE
        elif 'blockquote' in tagStack:
            return self.colors['blockquote']
        elif 'latex' in tagStack:
            return self.colors['latex']
        elif 'strong' in tagStack:
            return self.colors['strong'] | curses.A_BOLD
        elif 'del' in tagStack:
            return self.colors['del']
        else:
            return self.colors['body']

    # define some basic color codes
    # https://github.com/tomasiser/vim-code-dark/blob/master/README.md
    BG           = 0x1e1e1e
    GRAY         = 0x808080
    FG           = 0xd4d4d4
    LIGHTBLUE    = 0x9cdcfe
    BLUE         = 0x569cd6
    BLUEGREEN    = 0x4ec9b0
    GREEN        = 0x608b4e
    LIGHTGREEN   = 0xb5cea8
    YELLOW       = 0xdcdcaa
    YELLOWORANGE = 0xd7ba7d
    ORANGE       = 0xce9178
    LIGHTRED     = 0xd16969
    RED          = 0xF44747
    PINK         = 0xc586c0
    VIOLET       = 0x646695
    WHITE        = 0xffffff

    # color configuration for various element types
    color_config = [
        # menu elements
        ('header'    , WHITE     , ORANGE),
        ('footer'    , WHITE     , ORANGE),
        ('toc'       , BLUE      , BG    ),
        # tables
        ('th'        , WHITE     , BLUE  ),
        # inline styles
        ('body'      , FG        , BG    ),
        ('strong'    , WHITE     , BG    ),
        ('del'       , GRAY      , BG    ),
        ('a'         , BLUE      , BG    ),
        # headings
        ('h1'        , RED       , BG    ),
        ('heading'   , RED       , BG    ),
        # block styles
        ('code'      , LIGHTBLUE , BG    ),
        ('latex'     , LIGHTGREEN, BG    ),
        ('blockquote', YELLOW    , BG    ),
    ]

################################################################################

if __name__ == '__main__':

    parser = argparse.ArgumentParser(description="Browser for rendered markdown")
    parser.add_argument('--force-xterm-256', action='store_true', help="Force xterm-256color TERM environment variable")
    parser.add_argument('--log-file', help="File to store log data")
    parser.add_argument('--log-level', help="Logging level", default='INFO')
    parser.add_argument('file', help="Input file name")
    args = parser.parse_args()

    # force xterm-256color for underline support
    if args.force_xterm_256:
        os.environ['TERM'] = 'xterm-256color'

    # configure logging
    if args.log_file is not None:
        logging.basicConfig(
            filename='browser.log',
            level=getattr(logging,args.log_level),
            filemode='wt')

    # start application
    app = Application()
    app.loadFile(args.file)
    app.startCurses()

    # scroll data on key presses
    for row in range(0, len(app.lineData.lineData), curses.LINES - 4):
        if row > 0:
            app.curses.stdscr.getch()
        app.displayData(row)

    # embed an ipython kernel (connect with ipython --existing)
    # import IPython;IPython.start_kernel()

    # wait for character input
    app.curses.stdscr.getch()
    app.curses.teardown()

