#!/usr/bin/env python
import sys
import os
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

class Parser:

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
        maxLen = [0] * max(map(len, thead+tbody))
        for tr in thead + tbody:
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
                    for line in InlineData.fromChild(subChild, tagStack=['li']).data:
                        for styles,txt in line:
                            self.append(txt, styles, indent=len(leader))

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
        return Parser(width).render(container)

    @staticmethod
    def fromFile(fileName, element=None, width=None):
        with open(fileName, 'rt') as F:
            html = F.read()
        return Parser.fromString(html, element=element, width=width)

################################################################################

class BaseRenderer(object):
    """Base class for rendering parsed data"""

    def __init__(self):
        pass

    @staticmethod
    def simplifyStack(ts):
        """Simplify tag stack to a single tag"""

        # style as body if there are no tags
        if len(ts) == 0:
            return 'body'

        # block tags prevent any other processing
        for tag in ['code', 'a', 'img', 'blockquote', 'latex']:
            if tag in ts:
                return tag
        if ts[0] in {'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}:
            return ts[0]
        if ts[0] == 'th':
            return 'th'

        # otherwise recurse for inline styles
        if ts[-1] == 'em':
            return 'em'
        elif ts[-1] == 'strong':
            return 'strong'
        elif ts[-1] == 'del':
            return 'del'
        else:
            return BaseRenderer.simplifyStack(ts[:-1])

    def render(self, lines, cols=80, logger=sys.stdout):
        """Render parsed HTML data"""
        for row, line in enumerate(lines):
            self.startLine(logger)
            col = 0
            for tags, txt in line:
                if col < cols:
                    if col + len(txt) > cols:
                        txt = txt[:cols - col]
                        logging.info('Trimming text')
                    logging.info('Adding text at %d,%d: "%s"' % (row + 1, col, txt))
                    self.writeStyled(txt, tags, logger=logger)
                else:
                    logging.info('Skipping text (beyond window): "%s"' % txt)
                col += len(txt) + 1
                if col < cols:
                    self.writeStyled(' ', ['body'], logger=logger)
            self.writeStyled(' ' * (cols - col), ['body'], logger=logger)
            self.endLine(logger)            

    def startLine(self, logger):
        """Start a line"""
        pass

    def endLine(self, logger):
        """End a line"""
        logger.write('\n')

    def writeStyled(self, txt, tags, logger=sys.stdout):
        tag = self.simplifyStack(tags)
        logger.write('<%s>%s</%s>' % (tag, txt, tag))

################################################################################

class ColorConfiguration:
    """Base class for a color scheme"""

    def __init__(self, colors, ctor=TerminalColors256.Color24Bit):
        self.ctor = ctor
        self.colors = {}
        for k,v in colors.items():
            self.colors[k] = {'bold':False, 'italic':False, 'underline':False}
            for k2,v2 in v.items():
                if k2 in ['fg','bg']:
                    self.colors[k][k2] = ctor(v2)
                else:
                    self.colors[k][k2] = v2

    def baseBgColor(self):
        """Return the base background color"""
        return self.colors['body']['bg']

    def baseFgColor(self):
        """Return the base foreground color"""
        return self.colors['body']['fg']

    def tagStyle(self, tag):
        """Return the style for a tag"""
        if tag in {'h2','h3','h4','h5','h6'}:
            return self.colors['heading']
        else:
            return self.colors[tag]

    @staticmethod
    def vimCodeDark(ctor=TerminalColors256.Color24Bit):
        """Construct a ColorConfiguration with vim-code-dark scheme"""

        # define some basic color codes
        # https://github.com/tomasiser/vim-code-dark/blob/master/README.md
        BG = 0x1e1e1e
        GRAY = 0x808080
        FG = 0xd4d4d4
        LIGHTBLUE = 0x9cdcfe
        BLUE = 0x569cd6
        BLUEGREEN = 0x4ec9b0
        GREEN = 0x608b4e
        LIGHTGREEN = 0xb5cea8
        YELLOW = 0xdcdcaa
        YELLOWORANGE = 0xd7ba7d
        ORANGE = 0xce9178
        LIGHTRED = 0xd16969
        RED = 0xF44747
        PINK = 0xc586c0
        VIOLET = 0x646695
        WHITE = 0xffffff

        # use colors in a configuration
        color_config = {
            # gui elements
            'header': {'fg':WHITE, 'bg':ORANGE},
            'footer': {'fg':WHITE, 'bg':ORANGE},
            'toc'   : {'fg':BLUE},
            'treeline' : {'fg':BLUEGREEN},
            'treetext' : {'fg':WHITE},
            # tables
            'th': {'fg':WHITE, 'bg':BLUE},
            # inline styles
            'body': {'fg':FG, 'bg':BG},
            'strong': {'fg':WHITE, 'bold':True},
            'em':{'underline':True},
            'del': {'fg':GRAY},
            'a':{'fg':BLUE, 'underline':True},
            'img':{'fg':BLUE, 'underline':True},
            # headings
            'h1':{'fg':WHITE, 'bg':RED, 'bold':True},
            'heading':{'fg':RED, 'bold':True},
            # block styles
            'code':{'fg':LIGHTBLUE, 'italic':True},
            'latex':{'fg':LIGHTGREEN},
            'blockquote':{'fg':YELLOW}
        }

        # construct an object
        return ColorConfiguration(color_config, ctor=ctor)

################################################################################

class VimRenderer(BaseRenderer):

    def __init__(self, colors):
        self.colors = colors

    def vimStyle(self, data, name):
        prop = []

        if 'fg' in data:
            prop.append('guifg=%s' % self._colorHex(data['fg']))
            prop.append('ctermfg=%s' % data['fg'].index256())
        if 'bg' in data:
            prop.append('guibg=%s' % self._colorHex(data['bg']))
            prop.append('ctermbg=%s' % data['bg'].index256())
            
        attr = []
        if data['bold']:
            attr.append('bold')
        if data['italic']:
            attr.append('italic')
        if data['underline']:
            attr.append('underline')
        if len(attr) > 0:
            prop.append('gui=%s' % ','.join(attr))
            prop.append('cterm=%s' % ','.join(attr))

        return 'hi %s %s\n' % (name, ' '.join(prop))

    def genStyle(self, fileName=None, logger=sys.stdout):
        if fileName is not None:
            with open(fileName, 'wt') as F:
                self.genStyle(logger=F)
        else:
            logger.write('setlocal conceallevel=2\n')
            logger.write('setlocal concealcursor=nc\n')
            logger.write('\n')
            logger.write('hi Normal guifg=%s guibg=%s ctermfg=%s ctermbg=%s\n' % (
                self._colorHex(self.colors.baseFgColor()),
                self._colorHex(self.colors.baseBgColor()),
                self.colors.baseFgColor().index256(),
                self.colors.baseBgColor().index256()
            ))
            for k,data in self.colors.colors.items():
                if k == 'heading':
                    logger.write('syn region in{0} concealends matchgroup={0} start="<{1}>" end="</{1}>"\n'.format(k,'h[2-6]'))
                else:
                    logger.write('syn region in{0} concealends matchgroup={0} start="<{0}>" end="</{0}>"\n'.format(k))
            logger.write('\n')
            for k,data in self.colors.colors.items():
                logger.write(self.vimStyle(data,'in'+k))
    
    def genTreeStyle(self, fileName=None, logger=sys.stdout):
        if fileName is not None:
            with open(fileName, 'wt') as F:
                self.genTreeStyle(logger=F)
        else:
            logger.write('syn match treeLine "\\%u2500\\|\\%u2502\\|\\%u2514\\|\\%u251c"\n')
            logger.write('syn region tocHeader concealends matchgroup=tocHeader start="{" end="$"\n')
            logger.write(self.vimStyle(self.colors.colors['treeline'], 'tocHeader'))
            logger.write(self.vimStyle(self.colors.colors['treeline'], 'treeLine'))
            logger.write(self.vimStyle(self.colors.colors['strong'], 'Normal'))
            logger.write('setlocal conceallevel=2\n')
            logger.write('setlocal concealcursor=nc\n')

    @staticmethod
    def getTOC(renderedLines):

        # identify headings
        headings = [
            line[2:].split('<')[0].split('>')+[i]
            for i,line in enumerate(renderedLines)
            if line[:4] in {'<h2>','<h3>','<h4>','<h5>','<h6>'}
        ]
        headings = [(int(a),b,c) for a,b,c in headings]

        # fix any bad level numbers
        lvl = [None]*len(headings)
        txt = [None]*len(headings)
        src = [None]*len(headings)
        for i,heading in enumerate(headings):
            l,t,s = heading
            if i == 0 and l > 2:
                l = 2
            elif i > 0 and l > headings[i-1][0] + 1:
                l = headings[i-1][0] + 1
            lvl[i],txt[i],src[i] = l,t,s

        # identify whether headings have downstream siblings
        # (later entry exists with same level without being broken by higher level)
        has_sibling = [None] * len(lvl)
        found_levels = [False] * 7
        for i in range(len(lvl))[::-1]:
            level = lvl[i]
            for j in range(level+1,7):
                found_levels[j] = False
            if not found_levels[level]:
                found_levels[level] = True
                has_sibling[i] = False
            else:
                has_sibling[i] = True

        # identify parent headings
        parents = [None] * len(headings)
        found_parents = [None] * 7
        for i in range(len(lvl)):
            found_parents[lvl[i]] = i
            if lvl[i] > 2:
                parents[i] = found_parents[lvl[i]-1]

        # return leader sequence depending on existence of siblings
        def treeLeader(i, recurse=False):
            if i is None:
                return ''
            elif not recurse:
                if has_sibling[i]:
                    tail = u'\u251c' + u'\u2500'*2 # tee
                else:
                    tail = u'\u2514' + u'\u2500'*2 # elbow
                return treeLeader(parents[i], recurse=True) + tail
            else:
                if has_sibling[i]:
                    tail = u'\u2502' + ' '*2 # pipe
                else:
                    tail = ' '*3 # spaces
                return treeLeader(parents[i], recurse=True) + tail

        # build tree
        tree = [treeLeader(i)+t for i,t in enumerate(txt)]

        # identify folds
        folds = []
        for i,level in enumerate(lvl):
            if i+1 < len(lvl) and lvl[i+1] > level:
                foldEnd = [i+j for j,x in enumerate(lvl[i+1:]) if x <= level]
                if len(foldEnd) > 0:
                    folds.append(( i,foldEnd[0] ))
                else:
                    folds.append(( i,len(lvl)-1 ))
        
        # return results
        return tree,folds,src

    @staticmethod
    def _colorHex(color):
        return '#%02x%02x%02x' % (color.r,color.g,color.b)

################################################################################

class RtfRenderer(BaseRenderer):

    def __init__(self, colors):
        self.colors = colors

    def render(self, lines, cols=80, logger=sys.stdout):
        """Render parsed HTML data"""
        logger.write('{\\rtf1\\ansi\deff0\n')
        logger.write('{\\fonttbl {\\f0 Menlo;}}\\f0\\fs16\n')
        logger.write("{\colortbl ; \\red0\\green0\\blue0; \\red255\\green255\\blue255; }\n")
        logger.write('\\deflang1033 ') # language is US English
        logger.write('\\widowctrl ')
        logger.write('\\margr720 \\margl720 \\margt720 \\margb720\n') # set margins to 0.5"

        super(RtfRenderer,self).render(lines, cols=cols, logger=logger)
        logger.write('}')

    def startLine(self, logger):
        """Start a line"""
        logger.write('{\\pard ')

    def endLine(self, logger):
        """End a line"""
        logger.write(' \\par}\n')

    def writeStyled(self, txt, tags, logger=sys.stdout):
        txt = txt.replace('\\','\\\\').replace('{','\\{').replace('}','\\}')

        stack = self.simplifyStack(tags)
        style = self.colors.tagStyle(stack)
        if style['bold']:
            txt = '{\\b ' + txt + '}'
        if style['italic']:
            txt = '{\\i ' + txt + '}'
        if style['underline']:
            txt = '{\\ul ' + txt + '}'
        if 'h1' in stack:
            txt = '{\\fs28 ' + txt + '}'
        if 'th' in stack:
            txt = '{\\cf0{\\chshdng10000\\chcbpat1\\chcfpat1\\cb1 ' + txt + '}}'
        if 'code' in stack:
            txt = '{\\cf0{\\chshdng3000\\chcbpat1\\chcfpat1\\cb1 ' + txt + '}}'
        logger.write(txt)

################################################################################

class ColoredRenderer(BaseRenderer):

    def __init__(self, colors):
        self.colors = colors

    def writeStyled(self, txt, tags, logger=sys.stdout):
        def render(txt, fg=None, bg=None, bold=False, underline=False):
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
        style = self.colors.tagStyle(self.simplifyStack(tags))
        logger.write(render(txt, fg=style.get('fg',None), bg=style.get('bg',None), bold=style['bold'], underline=style['underline']))

################################################################################

def testDirectory(dirname, renderer, cols):
    if os.path.isdir(dirname):
        for f in [os.path.join(dirname,ff) for ff in os.listdir(dirname)]:
            if os.path.isdir(f):
                testDirectory(f, renderer, cols)
            elif f.endswith('.html'):
                try:
                    lineData = Parser.fromFile(f, element='div#markdown-container', width=cols).lineData
                    with open('/dev/null', 'wt') as devnull:
                        renderer.render(lineData, cols=cols, logger=devnull)
                    status = TerminalColors256.Color16('green').render('PASS', display=False)
                except:
                    status = TerminalColors256.Color16('red').render('FAIL', display=False)
                print "[%s] %s" % (status, f)

################################################################################

if __name__ == '__main__':

    parser = argparse.ArgumentParser(description="Browser for rendered markdown")
    parser.add_argument('--log-file', help="File to store log data")
    parser.add_argument('--log-level', help="Logging level", default='INFO')
    parser.add_argument('--columns', help="Number of columns to display", type=int)
    parser.add_argument('--256', help="Use 256 colors instead of 24-bit", action="store_true")
    parser.add_argument('--vim', help="Use tags recognizable in vim", action="store_true")
    parser.add_argument('--vim-style', help="Generate a style file for generated vim")
    parser.add_argument('--vim-tree-style', help="Generate a style file for generated vim tree")
    parser.add_argument('--rtf', help="Generate output as an RTF", action="store_true")
    parser.add_argument('--test', help="Test parser on files in specified directory", action="store_true")
    parser.add_argument('file', help="Input file name")
    args = parser.parse_args()

    # configure logging
    if args.log_file is not None:
        logging.basicConfig(
            filename='browser.log',
            level=getattr(logging,args.log_level),
            filemode='wt')

    # configure colors
    if getattr(args, '256'):
        colors = ColorConfiguration.vimCodeDark(ctor=TerminalColors256.Color256)
    else:
        colors = ColorConfiguration.vimCodeDark()

    # configure renderer
    if args.vim:
        renderer = VimRenderer(colors)
    elif args.rtf:
        renderer = RtfRenderer(colors)
    else:
        renderer = ColoredRenderer(colors)

    # configure column count
    if args.columns is None:
        args.columns = 110 if args.rtf else 80

    # parse html and generate output
    if not args.test:
        lineData = Parser.fromFile(args.file, element='div#markdown-container', width=args.columns).lineData
        renderer.render(lineData, cols=args.columns)
    else:
        testDirectory(args.file, renderer, args.columns)
    
    # generate vim style file
    if args.vim_style:
        renderer = VimRenderer(colors)
        renderer.genStyle(args.vim_style)
    elif args.vim_tree_style:
        renderer = VimRenderer(colors)
        renderer.genTreeStyle(args.vim_tree_style)

