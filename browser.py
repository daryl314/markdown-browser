#!/usr/bin/env python
import curses
import curses.panel
import os
import time
import logging
import argparse

import TerminalColors256
from TagPair import TagPair
from Renderer import Parser, ColorConfiguration, BaseRenderer

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
            logging.info("Configuring color pair %s: (%d,%d,%d)" % (k,i+1,fg,bg))
            curses.init_pair(i + 1, fg, bg)
            out[k] = curses.color_pair(i + 1)
        return out

    def teardown(self):
        """Terminate a curses session"""
        curses.nocbreak()
        self.stdscr.keypad(0)
        curses.echo()
        curses.endwin()

################################################################################

class Application:

    NAVWIDTH = 30

    def __init__(self):
        self.curses = CursesHandler()
        self.color_config = ColorConfiguration.vimCodeDark(ctor=TerminalColors256.Color256)

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
            logging.info(Parser(80).render(self.container).dumpString(withLines=True))

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
        colors = []
        baseBg = self.color_config.baseBgColor()
        baseFg = self.color_config.baseFgColor()
        for k,v in self.color_config.colors.items():
            fg = v.get('fg',baseFg)
            bg = v.get('bg',baseBg)
            colors.append(( k, fg.index, bg.index ))
        self.colors = self.curses.configColors(colors)

        self.lineData = Parser(curses.COLS - 34).render(app.container)
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
            for tagStack,txt in line:
                if col < cols:
                    style = BaseRenderer.simplifyStack(tagStack)
                    logging.info('Adding text at %d,%d (%d): "%s"' % (row + 1, col, self.colors[style], txt))
                    self.windows['body'].addstr(row + 1, col, txt[:cols - col], self.colors[style])
                else:
                    logging.info('Skipping text (beyond window): "%s"' % txt)
                col += len(txt) + 1
        self.windows['body'].refresh()

    def headerText(self, txt):
        self.windows['header'].hline(0, 0, ' ', curses.COLS, app.colors['header'])
        self.windows['header'].addstr(0, 0, txt, app.colors['header'])

    def footerText(self, txt):
        self.windows['footer'].hline(0, 0, ' ', curses.COLS, app.colors['footer'])
        self.windows['footer'].addstr(0, 0, txt, app.colors['footer'])

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
            filename=args.log_file,
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

