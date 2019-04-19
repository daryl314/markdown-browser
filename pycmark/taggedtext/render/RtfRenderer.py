from pycmark.taggedtext.TaggedCmarkDocument import TaggedTextDocument
import sys, cStringIO, StringIO

class RtfRenderer(object):

    COLOR_TABLE = "{\colortbl ;\\red255\\green255\\blue255;\\red0\\green0\\blue0;\\red192\\green192\\blue192;}"

    @classmethod
    def styleTT(cls, tt):
        txt = tt.text
        if 'strong' in tt.tags or 'heading' in tt.tags or 'heading1' in tt.tags:
            txt = '{\\b ' + txt + '}'  # bold
        if 'code' in tt.tags or 'code_block' in tt.tags:
            txt = '{\\i ' + txt + '}'  # italic
        if 'emph' in tt.tags or 'link' in tt.tags or 'image' in tt.tags:
            txt = '{\\ul ' + txt + '}'  # underline
        if 'heading1' in tt.tags:
            txt = '{\\fs28 ' + txt + '}'
        if 'table_header' in tt.tags:
            txt = '{\\cf1\\cb2\\highlight2 ' + txt + '\\cf0\\highlight0}'
        if 'code' in tt.tags or 'code_block' in tt.tags:
            txt = '{\\cf2\\cb3\\highlight3 ' + txt + '\\cf0\\highlight0}'
        return txt

    @classmethod
    def renderFromDoc(cls, docTree, title=None, width=100):
        logger = cStringIO.StringIO()

        # generate RTF header material
        logger.write('{\\rtf1\\ansi\deff0\n')                  # RTF header
        logger.write('{\\fonttbl {\\f0 Menlo;}}\\f0\\fs16\n')  # default font
        logger.write(cls.COLOR_TABLE)                          # color table
        logger.write('\\deflang1033 ')                         # language is US English
        logger.write('\\widowctrl ')                           # avoid dangling single lines in paragraphs
        if title is None:                                      # margins to 0.5 inches (no title)
            logger.write('\\margr720 \\margl720 \\margt720 \\margb720\n')
        else:                                                  # margins to 0.5 inches (with title)
            logger.write('\\margr720 \\margl720 \\margt0 \\margb720\n')
        if title is not None:                                  # title in header if defined
            logger.write('{\\header \\pard\\qc\\fs16\\sa180 %s\\par}\n' % title)

        # subfunction to render a block of rows
        def render(rows):
            for i, row in enumerate(rows):
                for tt in row.tt_list:
                    logger.write(cls.styleTT(tt))
                if i + 1 < len(rows):  # no trailing newline
                    logger.write('\\line\n')
            logger.write('\\par}\n')

        # iterate over document
        for subtree in docTree.walk():
            for i, node in enumerate(subtree.Section.Data):
                for j, block in enumerate(TaggedTextDocument.wrapAstNode(node, width=width, withUnicode=False)):

                    # non-breaking paragraph with window/orphan control
                    logger.write('{\\pard \\widctlpar \\keep')

                    # only add 18 pt spacing below if this block won't be split
                    if len(block.rows) < 6:
                        logger.write(' \\sa180')

                    # additional processing for headings
                    if i == 0 and j == 0 and node._tag.startswith('heading'):
                        logger.write(' \\keepn\n')  # keep headings with content below
                        if len(subtree.Number) == 1:
                            block.rows[0].pushLeft('%d.0 ' % subtree.Number[0])
                        elif len(subtree.Number) > 1:
                            block.rows[0].pushLeft('.'.join(map(str, subtree.Number)) + ' ')
                    else:
                        logger.write('\n')  # end pard properties for non-heading

                    # render block
                    if len(block.rows) < 6:
                        render(block.rows)
                    else:
                        render(block.rows[:3])          # keep top 3 rows together
                        if len(block.rows) > 6:         # if a middle block exists...
                            logger.write('{\\pard\n')   # allow it to break
                            render(block.rows[3:-3])    # and render it
                        logger.write('{\\pard \\widctlpar \\keep \\sa180\n')
                        render(block.rows[-3:])         # keep bottom 3 rows together

        # terminate RTF
        logger.write('}')

        # return result
        buf = logger.getvalue()
        logger.close()
        return buf
