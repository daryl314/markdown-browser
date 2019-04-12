#!/usr/bin/env python

import re, collections
from pycmark.taggedtext.TaggedCmarkDocument import TaggedTextBlock
from pycmark.util.TypedTree import TypedTree

################################################################################

class Section(TypedTree.GenerateConstructor('Section', ['Level', 'Data'])):
    """Data container for a section in a document"""

    @classmethod
    def fromBlocks(cls, blocks):
        if blocks[0]._tag == 'heading':
            return Section(Level=blocks[0].Level, Data=blocks)
        else:
            return Section(Level=1, Data=blocks)

    @property
    def title(self):
        return TaggedTextBlock().fromBlock(self.Data[0]).__repr__()

    @property
    def src(self):
        return self.Data[0].position.r1

################################################################################

class DocumentTree(TypedTree.GenerateConstructor('DocumentTree', ['ID', 'Section', 'Children'])):
    """Data container for a document section with sub-sections"""

    def walk(self):
        out = [self]
        for child in self.Children:
            out += child.walk()
        return out

    @property
    def n_children(self):
        return len(self.Children) + sum([child.n_children for child in self.Children])

    @property
    def src(self):
        return self.Section.src

    @property
    def title(self):
        return self.Section.title

    @classmethod
    def fromAst(cls, tt):
        assert isinstance(tt, TypedTree.TT) and tt._tag == 'Document'

        # split document on headings
        assigned_ids = set()
        sections = collections.deque()
        for i,c in enumerate(cls.splitWhere(tt.nodes, lambda n: n._tag == 'heading' and n.Level > 1)):
            if i > 1 or c[0]._tag == 'heading':
                a = re.sub('-$', '', re.sub(r'\W+', '-', TaggedTextBlock().fromBlock(c[0]).__repr__().lower()))
            else:
                a = 'root'
            if a in assigned_ids:
                a += '--%d' % len(assigned_ids)
            assigned_ids.add(a)
            sections.append((a, Section.fromBlocks(c)))

        # build up a tree
        def buildTree(id, root):
            children = []
            while len(sections) > 0 and sections[0][1].Level > root.Level:
                children.append(buildTree(*sections.popleft()))
            return DocumentTree(ID=id, Section=root, Children=children)
        return buildTree(*sections.popleft())

    @staticmethod
    def splitWhere(arr, fn, dropEmptyHead=True):
        out = [[]]
        for x in arr:
            if fn(x):
                out.append([x])
            else:
                out[-1].append(x)
        if dropEmptyHead and len(out[0]) == 0:
            out = out[1:]
        return out

