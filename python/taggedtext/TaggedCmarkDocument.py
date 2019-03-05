from . import TaggedTextDocument as TTD


class TaggedTextDocument(TTD.TaggedTextDocument):
    """
    Class representing a document as a list of TaggedTextBlocks
    """

    @classmethod
    def fromAST(cls, ast, width=80, ttclass=None):
        """Parse an AST representation of a markdown document into a TaggedTextDocuent"""
        doc = cls()
        for block in ast.nodes:
            if block._tag == 'block_quote':
                for qb in block.children:
                    doc.append(TaggedTextBlock(ttclass=ttclass, width=width).fromBlock(qb).prependTag('block_quote'))
            else:
                doc.append(TaggedTextBlock(ttclass=ttclass, width=width).fromBlock(block))
        for block in doc.blocks:
            for row in block.rows:
                row.padTo(width)
        return doc


class TaggedTextBlock(TTD.TaggedTextBlock):
    """
    Class representing a block of TaggedText as a list of TaggedTextList rows
    """

    def __init__(self, rows=None, width=80, ttclass=None, ttlclass=None):
        self.width = width
        self.rows = [] if rows is None else rows
        self.TT = TaggedText if ttclass is None else ttclass
        self.TTL = TaggedTextList if ttlclass is None else ttlclass

    def fromBlocks(self, blocks):
        for block in blocks:
            self.fromBlock(block)
        return self

    def fromBlock(self, block):
        # block-level containers
        if block._tag in {'paragraph', 'heading', 'item'}:  # no line breaks
            if block._tag == 'heading' and block.Level == 1:
                wrapped = self.TTL.fromContainer(block, self.TT, ['heading1']).wrapTo(self.width)
            else:
                wrapped = self.TTL.fromContainer(block, self.TT).wrapTo(self.width)
            for row in wrapped:
                self.rows.append(row)
        # block-level leaf nodes
        elif block._tag in {'code_block', 'html_block'}:
            for row in block.Text.split('\n'):
                self.rows.append(self.TTL.fromText(row, self.TT, [block._tag]))
        elif block._tag == 'thematic_break':
            self.rows.append(self.TTL.fromText('-' * self.width, self.TT, [block._tag]))
        elif block._tag == 'table':
            rowData = [[self.TTL.fromContainer(td, self.TT, [tr._tag]) for td in tr.children] for tr in block.children]
            colWidth = [max([len(r[i]) for r in rowData]) for i in range(max(map(len, rowData)))]
            rowData = [self.TTL.join([td.padTo(w) for td, w in zip(tr, colWidth)], '|', self.TT) for tr in rowData]
            self.rows += rowData[:1] + [self.TTL.fromText('|'.join(['-' * x for x in colWidth]), self.TT)] + rowData[1:]
        elif block._tag == 'list':
            if block.Type == 'Bullet':
                listHeader = lambda i: '* '
            elif block.Type == 'Ordered':
                blockStart = block.Start
                listHeader = lambda i: '%{}d. '.format(len(str(len(block.children)+blockStart-1))) % (i+blockStart)
            else:
                raise RuntimeError("Unrecognized list type: " + block.Type)
            for i,li in enumerate(block.children):
                subBlock = self.__class__(width=self.width-2, ttclass=self.TT, ttlclass=self.TTL).fromBlocks(li.children)
                self.rows.append(subBlock.rows[0].pushLeft(listHeader(i),['list']))
                self.rows += [row.pushLeft(' '*len(listHeader(i)),['list']) for row in subBlock.rows[1:]]
        else:
            raise RuntimeError("Unrecognized container: " + block.__repr__())
        return self


class TaggedTextList(TTD.TaggedTextList):
    """
    Class representing a list of TaggedText objects
    """

    @classmethod
    def fromContainer(cls, container, TT, tagStack=[], **kwargs):
        obj = cls(TT)
        obj.tt_list = obj.processContainer(container, tagStack[:]+[container._tag], **kwargs)
        return obj

    def processContainer(self, container, tagStack):
        out = []
        for child in container.children:
            newstack = tagStack[:] + [child._tag]
            if child._tag == 'softbreak':
                out += [self.TT(' ', newstack)]
            elif child._tag == 'linebreak':
                out += [self.TT('\n', newstack)]
            elif 'Text' in child._fields and len(child.children) == 0:
                out.append(self.TT(child.Text, newstack))
            elif 'Text' not in child._fields and len(child.children) > 0:
                out += self.processContainer(child, newstack)
            else:
                raise RuntimeError("Unanticipated child container: {}".format(container))
        return out


class TaggedText(TTD.TaggedText):
    """
    Class representing a block with text with styles applied
    """

    def simplifyStack(self):
        """Simplify tag stack to a single tag"""
        for tag in self.tags:
            if tag in {'code_block','block_quote','heading1','heading','table_header','latex_inline','latex_block'}:
                return tag
        for tag in reversed(self.tags):
            if tag in {'emph','strong','strikethrough','code','image','link'}:
                return tag
        return 'body'