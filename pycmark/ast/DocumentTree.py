#!/usr/bin/env python

import re, collections
from pycmark.taggedtext.TaggedCmarkDocument import TaggedTextBlock
from pycmark.util.TypedTree import TypedTree

################################################################################

class Section(TypedTree.GenerateConstructor('Section', ['Level', 'Data'])):
    """Data container for a section in a Document (list of Document nodes)

    A Section represents an AST heading and its associated content as a list
    of AST nodes.  A heading may not exist for the first chunk of a document
    if content exists before the first heading.  Otherwise a heading will be
    the first entry in the list
        - Level : Section indentation level (heading depth)
        - Data  : List of AST nodes
    """

    @classmethod
    def fromBlocks(cls, blocks, firstBlock=False):
        if not firstBlock and blocks[0]._tag == 'heading':
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

class DocumentTree(TypedTree.GenerateConstructor('DocumentTree', ['ID', 'Number', 'Section', 'Children'])):
    """Data container for a document section with sub-sections

    A DocumentTree is a recursive tree data structure containing sections in a
    markdown document and their nested sub-sections.
        - ID       : unique section id based on section heading
        - Number   : section number (tuple of ints: (x,y,z) --> x.y.z)
        - Section  : Section content associated with root node
        - Children : DocumentTree list for children of root node
    """

    def walk(self):
        out = [self]
        for child in self.Children:
            out += child.walk()
        return out

    def dumpHeadingTree(self, indent=0):
        print(' '*indent + '.'.join(map(str, self.Number)), self.ID)
        for child in self.Children:
            child.dumpHeadingTree(indent=indent+4)

    def isHeading(self):
        """True if first element is a non-title heading"""
        if len(self.Section.Data) > 0:
            firstBlock = self.Section.Data[0]
            return firstBlock._tag == 'heading' and firstBlock.Level > 1
        return False

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

        # split documents on headings
        chunks = cls.splitWhere(tt.nodes, lambda n: n._tag == 'heading' and n.Level > 1)

        # put in a fake root node if the first node is a heading
        if len(chunks) > 0 and len(chunks[0]) > 0 and chunks[0][0]._tag == 'heading' and chunks[0][0].Level > 1:
            chunks.insert(0, [])

        # build up a list of sections
        assigned_ids = set()  # assigned section IDs
        sections = collections.deque()
        for i,c in enumerate(chunks):
            
            # determine section id
            if i > 1 or (len(c) > 0 and c[0]._tag == 'heading'):
                a = re.sub('-$', '', re.sub(r'\W+', '-', TaggedTextBlock().fromBlock(c[0]).__repr__().lower()))
            else:
                a = 'root'
            if a in assigned_ids:
                a += '--%d' % len(assigned_ids)
            assigned_ids.add(a)

            # section list entry is a tuple of (ID, Section)
            sections.append((a, Section.fromBlocks(c, firstBlock=i == 0)))

        # helper function to recursively build up a tree
        def buildTree(id, root, num=()):
            children = []  # children of current root node

            # while there are sections indented under the current root in the queue...
            # generate a tree from the first section in the queue and append it to the list of children
            counter = 1
            while len(sections) > 0 and sections[0][1].Level > root.Level:
                children.append(buildTree(*sections.popleft(), num=num+(counter,)))
                counter += 1

            # concretize and return the sub-tree
            return DocumentTree(ID=id, Number=num, Section=root, Children=children)

        # first entry in the section list is the root node and everything else should be nested below it
        # assemble a DocumentTree from the root node
        doctree = buildTree(*sections.popleft())
        assert len(sections) == 0  # confirm that everything was slurped up
        return doctree

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

