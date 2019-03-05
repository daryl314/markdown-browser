import sys, textwrap, bisect
from ..util import TerminalColors256

class TaggedTextDocument(object):
    """
    Class representing a document as a list of TaggedTextBlocks
    """

    def __init__(self, blocks=None):
        self.blocks = [] if blocks is None else blocks

    def __repr__(self):
        return '\n\n'.join([block.__repr__() for block in self.blocks])

    def __iadd__(self, other):  # self += other
        assert isinstance(other, TaggedTextDocument)
        self.blocks += other.blocks
        return self

    def append(self, block):
        assert isinstance(block, TaggedTextBlock)
        self.blocks.append(block)

    def render(self, renderer=None, writer=sys.stdout):
        for block in self.blocks:
            block.render(renderer=renderer, writer=writer)


class TaggedTextBlock(object):
    """
    Class representing a block of TaggedText as a list of TaggedTextList rows
    """

    def __init__(self, rows=None, width=80, ttclass=None, ttlclass=None):
        self.width = width
        self.rows = [] if rows is None else rows
        self.TT = TaggedText if ttclass is None else ttclass
        self.TTL = TaggedTextList if ttlclass is None else ttlclass

    def __repr__(self):
        return '\n'.join([row.__repr__() for row in self.rows])

    def render(self, renderer=None, writer=sys.stdout):
        for row in self.rows:
            row.render(renderer=renderer, writer=writer)
        self.TTL(self.TT).push(' '*len(row)).render(renderer=renderer, writer=writer)

    def prependTag(self, tag):
        for row in self.rows:
            for tt in row.tt_list:
                tt.tags = [tag] + tt.tags
        return self


class TaggedTextList(object):
    """
    Class representing a list of TaggedText objects
    """

    def __init__(self, TT, tt_list=None):
        self.tt_list = [] if tt_list is None else tt_list
        self.TT = TT

    def __len__(self):
        return sum([len(tt.text) for tt in self.tt_list])

    def __repr__(self):
        return ''.join([tt.text for tt in self.tt_list])

    def __getitem__(self, item):
        if isinstance(item, slice):
            obj = self.copy()
            obj.tt_list = obj.tt_list.__getitem__(item)
            return obj
        else:
            return self.tt_list.__getitem__(item)

    def __add__(self, other):
        assert isinstance(other, self.__class__)
        self.tt_list += other.tt_list
        return self

    def render(self, renderer=None, writer=sys.stdout):
        for tt in self.tt_list:
            tt.render(renderer=renderer, writer=writer)
        writer.write('\n')

    @classmethod
    def fromText(cls, txt, TT, tagStack=[]):
        return cls(TT).push(txt, tagStack[:])

    @classmethod
    def join(cls, ttl_list, txt, TT, tagStack=[]):
        out = ttl_list[0].copy()
        for t in ttl_list[1:]:
            out += cls(TT).push(txt,tagStack[:]) + t
        return out

    def copy(self):
        return self.__class__(self.TT, [tt.copy() for tt in self.tt_list])

    def pushLeft(self, text, tagStack=[]):
        self.tt_list.insert(0, self.TT(text, tagStack[:]))
        return self

    def push(self, text, tagStack=[]):
        self.tt_list.append(self.TT(text, tagStack[:]))
        return self

    def pushAll(self, text_list, tagStack=[]):
        self.tt_list += [self.TT(text,tagStack[:]) for text in text_list]
        return self

    def padTo(self, width):
        if len(self) < width:
            self.push(' ' * (width - len(self)), [])
        return self

    def wrapTo(self, width):
        ttt = [tt.text for tt in self.tt_list]
        if '\n' in ttt:
            idx = ttt.index('\n')
            return self[:idx].wrapTo(width) + self[idx+1:].wrapTo(width)
        elif len(self) <= width:
            return [self]
        else:
            cumsum = [sum([len(tt.text) for tt in self.tt_list[:i+1]]) for i in range(len(self.tt_list))]
            split_loc = bisect.bisect_left(cumsum, width)
            wrapped = textwrap.wrap(self[:split_loc+1].__repr__(), width)
            head = self[:split_loc].push(wrapped[0][len(self[:split_loc]):], self[split_loc].tags)
            tail = self.__class__(self.TT).pushAll(wrapped[1:], self[split_loc].tags) + self[split_loc+1:]
            return [head] + tail.wrapTo(width)


class TaggedText(object):
    """
    Class representing a block with text with styles applied
    """

    def __init__(self, text, tags):
        assert text is not None
        self.text = text
        self.tags = tags

    def __repr__(self):
        return '%s<%s>: %s' % (self.__class__.__name__, '|'.join(self.tags), self.text.__repr__())

    def render(self, renderer=None, writer=sys.stdout):
        if renderer is None:
            writer.write(self.text)
        else:
            writer.write(renderer(self))
        return self.text

    def copy(self):
        return self.__class__(self.text, self.tags[:])

    @staticmethod
    def render24(txt, fg=None, bg=None, b=False, i=False, u=False):
        out = []
        if fg is not None:
            out.append(TerminalColors256.Color24Bit(fg).escapeFG())
        if bg is not None:
            out.append(TerminalColors256.Color24Bit(bg).escapeBG())
        if b:
            out.append(TerminalColors256.BaseColor.bold())
        if i:
            out.append(TerminalColors256.BaseColor.italic())
        if u:
            out.append(TerminalColors256.BaseColor.underline())
        if len(out) > 0:
            return ''.join(out) + txt + TerminalColors256.Color24Bit.escapeClear()
        else:
            return txt