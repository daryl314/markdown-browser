#!/usr/bin/env python
import sys
import time
import math
import logging
import cStringIO
import argparse

import TerminalColors256
from TagPair import TagPair

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

################################################################################

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
            fmt = '%%%dd.' % int(math.ceil(math.log10(len(el.children))))

        # iterate over child <li> elements
        for i,child in enumerate(el.children):
            assert isinstance(child,TagPair) and child.leftTag.tag == 'li'

            # start rendered <li> with bullet
            if el.leftTag.tag == 'ul':
                leader = '  ' * indent + '*'
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
            self.curSpace -= len(txt) + 1
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

    @staticmethod
    def fromString(html, element=None, width=None):

        # extract tag data
        t1 = time.time()
        tags = TagPair.fromHTML(html=html)
        t2 = time.time()
        logging.info("Parsed HTML in %.3f seconds" % (t2 - t1))

        # extract container
        container = tags.first('body')
        if element is not None:
            container = container[element]

        # get line data
        return Renderer(width).render(container)

    @staticmethod
    def fromFile(fileName, element=None, width=None):
        with open(fileName, 'rt') as F:
            html = F.read()
        return Renderer.fromString(html, element=element, width=width)

################################################################################

class TextRenderer(object):

    def __init__(self):
        pass

    def displayData(self, lines, cols=80):
        for row,line in enumerate(lines):
            col = 0
            for tags,txt in line:
                if col < cols:
                    if col + len(txt) > cols:
                        txt = txt[:cols-col]
                        logging.info('Trimming text')
                    logging.info('Adding text at %d,%d: "%s"' % (row + 1, col, txt))
                    self.writeStyled(txt, tags)
                else:
                    logging.info('Skipping text (beyond window): "%s"' % txt)
                col += len(txt) + 1
                if col < cols:
                    self.writeStyled(' ', ['body'])
            self.writeStyled(' '*(cols-col), ['body'])
            sys.stdout.write('\n')

    def writeStyled(self, txt, tags):
        fg, bg, b, u = self.stackColor(tags)
        sys.stdout.write(self.render(txt, fg=fg, bg=bg, bold=b, underline=u))

    def render(self, txt, fg=None, bg=None, bold=False, underline=False):
        out = []
        if fg is not None:
            out.append(fg.escapeFG())
        if bg is not None:
            out.append(bg.escapeBG())
        if bold:
            out.append(TerminalColors256.BaseColor.bold())
        if underline:
            out.append(TerminalColors256.BaseColor.underline())
        out.append(txt)
        out.append(TerminalColors256.BaseColor.escapeClear())
        return ''.join(out)

    # return the curses style associated with a tag stack
    def stackColor(self, tagStack):
        u = False
        b = False
        if len(tagStack) == 0:
            fg,bg = self.colors['body']
        elif 'em' in tagStack:
            fg,bg,_,_ = self.stackColor(list(set(tagStack) - {'em'}))
            u = True
        elif tagStack[0] == 'h1':
            fg, bg = self.colors['h1']
        elif tagStack[0] in {'h2', 'h3', 'h4', 'h5', 'h6'}:
            fg, bg = self.colors['heading']
            b = True
        elif tagStack[0] == 'th':
            fg, bg = self.colors['th']
        elif 'code' in tagStack:
            fg, bg = self.colors['code']
        elif 'a' in tagStack or 'img' in tagStack:
            fg, bg = self.colors['a']
            u = True
        elif 'blockquote' in tagStack:
            fg, bg = self.colors['blockquote']
        elif 'latex' in tagStack:
            fg, bg = self.colors['latex']
        elif 'strong' in tagStack:
            fg, bg = self.colors['strong']
            b = True
        elif 'del' in tagStack:
            fg, bg = self.colors['del']
        else:
            fg, bg = self.colors['body']
        return fg,bg,b,u

    # define some basic color codes
    # https://github.com/tomasiser/vim-code-dark/blob/master/README.md
    BG           = TerminalColors256.Color24Bit(0x1e1e1e)
    GRAY         = TerminalColors256.Color24Bit(0x808080)
    FG           = TerminalColors256.Color24Bit(0xd4d4d4)
    LIGHTBLUE    = TerminalColors256.Color24Bit(0x9cdcfe)
    BLUE         = TerminalColors256.Color24Bit(0x569cd6)
    BLUEGREEN    = TerminalColors256.Color24Bit(0x4ec9b0)
    GREEN        = TerminalColors256.Color24Bit(0x608b4e)
    LIGHTGREEN   = TerminalColors256.Color24Bit(0xb5cea8)
    YELLOW       = TerminalColors256.Color24Bit(0xdcdcaa)
    YELLOWORANGE = TerminalColors256.Color24Bit(0xd7ba7d)
    ORANGE       = TerminalColors256.Color24Bit(0xce9178)
    LIGHTRED     = TerminalColors256.Color24Bit(0xd16969)
    RED          = TerminalColors256.Color24Bit(0xF44747)
    PINK         = TerminalColors256.Color24Bit(0xc586c0)
    VIOLET       = TerminalColors256.Color24Bit(0x646695)
    WHITE        = TerminalColors256.Color24Bit(0xffffff)

    # color configuration for various element types
    colors = {
        # menu elements
        'header'    : (WHITE     , ORANGE),
        'footer'    : (WHITE     , ORANGE),
        'toc'       : (BLUE      , BG    ),
        # tables
        'th'        : (WHITE     , BLUE  ),
        # inline styles
        'body'      : (FG        , BG    ),
        'strong'    : (WHITE     , BG    ),
        'del'       : (GRAY      , BG    ),
        'a'         : (BLUE      , BG    ),
        # headings
        'h1'        : (RED       , BG    ),
        'heading'   : (RED       , BG    ),
        # block styles
        'code'      : (LIGHTBLUE , BG    ),
        'latex'     : (LIGHTGREEN, BG    ),
        'blockquote': (YELLOW    , BG    ),
    }

################################################################################

if __name__ == '__main__':

    parser = argparse.ArgumentParser(description="Browser for rendered markdown")
    parser.add_argument('--log-file', help="File to store log data")
    parser.add_argument('--log-level', help="Logging level", default='INFO')
    parser.add_argument('--columns', help="Number of columns to display", type=int, default=80)
    parser.add_argument('file', help="Input file name")
    args = parser.parse_args()

    # configure logging
    if args.log_file is not None:
        logging.basicConfig(
            filename='browser.log',
            level=getattr(logging,args.log_level),
            filemode='wt')

    # start application
    lineData = Renderer.fromFile(args.file, element='div#markdown-container', width=args.columns).lineData
    TextRenderer().displayData(lineData, cols=args.columns)

