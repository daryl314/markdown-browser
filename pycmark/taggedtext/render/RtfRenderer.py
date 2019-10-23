from io import BytesIO
from pycmark.taggedtext.TaggedCmarkDocument import TaggedTextDocument

class RtfRenderer(object):

    COLOR_TABLE = b"{\colortbl ;\\red255\\green255\\blue255;\\red0\\green0\\blue0;\\red192\\green192\\blue192;}"

    @classmethod
    def styleTT(cls, tt):
        txt = tt.text.encode()
        if 'strong' in tt.tags or 'heading' in tt.tags or 'heading1' in tt.tags:
            txt = b'{\\b ' + txt + b'}'  # bold
        if 'code' in tt.tags or 'code_block' in tt.tags:
            txt = b'{\\i ' + txt + b'}'  # italic
        if 'emph' in tt.tags or 'link' in tt.tags or 'image' in tt.tags:
            txt = b'{\\ul ' + txt + b'}'  # underline
        if 'heading1' in tt.tags:
            txt = b'{\\fs28 ' + txt + b'}'
        if 'table_header' in tt.tags:
            txt = b'{\\cf1\\cb2\\highlight2 ' + txt + b'\\cf0\\highlight0}'
        if 'code' in tt.tags or 'code_block' in tt.tags:
            txt = b'{\\cf2\\cb3\\highlight3 ' + txt + b'\\cf0\\highlight0}'
        return txt

    @classmethod
    def renderFromDoc(cls, docTree, title=None, width=100):
        logger = BytesIO()

        # generate RTF header material
        logger.write(b'{\\rtf1\\ansi\deff0\n')                  # RTF header
        logger.write(b'{\\fonttbl {\\f0 Menlo;}}\\f0\\fs16\n')  # default font
        logger.write(cls.COLOR_TABLE)                          # color table
        logger.write(b'\\deflang1033 ')                         # language is US English
        logger.write(b'\\widowctrl ')                           # avoid dangling single lines in paragraphs
        if title is None:                                      # margins to 0.5 inches (no title)
            logger.write(b'\\margr720 \\margl720 \\margt720 \\margb720\n')
        else:                                                  # margins to 0.5 inches (with title)
            logger.write(b'\\margr720 \\margl720 \\margt0 \\margb720\n')
        if title is not None:                                  # title in header if defined
            logger.write(b'{\\header \\pard\\qc\\fs16\\sa180 %s\\par}\n' % title.encode())

        # subfunction to render a block of rows
        def render(rows):
            for i, row in enumerate(rows):
                for tt in row.tt_list:
                    logger.write(cls.styleTT(tt))
                if i + 1 < len(rows):  # no trailing newline
                    logger.write(b'\\line\n')
            logger.write(b'\\par}\n')

        # iterate over document
        for subtree in docTree.walk():
            for i, node in enumerate(subtree.Section.Data):
                for j, block in enumerate(TaggedTextDocument.wrapAstNode(node, width=width, withUnicode=False)):

                    # non-breaking paragraph with window/orphan control
                    logger.write(b'{\\pard \\widctlpar \\keep')

                    # only add 18 pt spacing below if this block won't be split
                    if len(block.rows) < 6:
                        logger.write(b' \\sa180')

                    # additional processing for headings
                    if i == 0 and j == 0 and node._tag.startswith('heading'):
                        logger.write(b' \\keepn\n')  # keep headings with content below
                        if len(subtree.Number) == 1:
                            block.rows[0].pushLeft('%d.0 ' % subtree.Number[0])
                        elif len(subtree.Number) > 1:
                            block.rows[0].pushLeft('.'.join(map(str, subtree.Number)) + ' ')
                    else:
                        logger.write(b'\n')  # end pard properties for non-heading

                    # render block
                    if len(block.rows) < 6:
                        render(block.rows)
                    else:
                        render(block.rows[:3])          # keep top 3 rows together
                        if len(block.rows) > 6:         # if a middle block exists...
                            logger.write(b'{\\pard\n')   # allow it to break
                            render(block.rows[3:-3])    # and render it
                        logger.write(b'{\\pard \\widctlpar \\keep \\sa180\n')
                        render(block.rows[-3:])         # keep bottom 3 rows together

        # terminate RTF
        logger.write(b'}')

        # return result
        buf = logger.getvalue()
        logger.close()
        return buf
