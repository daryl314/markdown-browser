import re
from collections import deque

################################################################################

class ParserHelpers:
    """Container class for parsing helper functions"""

    # HTML regexes
    TagProperty = re.compile('\\s*(\\w+)+\\s*=\\s*(\'.*?\'|".*?")')
    Tag = re.compile(r'<\s*(\/?)\s*(\w+)(.*?)(\/?)>')

    @staticmethod
    def parseTagOptions(opt):
        """Convert tag options to a dict"""
        return dict([(x[0],x[1][1:-1]) for x in ParserHelpers.TagProperty.findall(opt)])

################################################################################

class Tag:
    """Representation of an HTML tag"""

    def __init__(self, match):
        lClose,tag,opt,rClose = match.groups()
        self.tag = tag
        self.isClosingTag = lClose == '/'
        self.isSelfClosing = rClose == '/'
        self.start = match.start()
        self.end = match.end()
        self.opt = ParserHelpers.parseTagOptions(opt)

    def __repr__(self):
        return self.tag + self.opt.__repr__()

################################################################################

class TagPair:
    """Representation of a pair of HTML tags and their inner content"""

    def __init__(self, tagIterator, html, unescape=True):
        self.tags = tagIterator  # iterator for Tag objects
        self.inhtml = html       # associated html
        self.children = []       # children of tag pair
        self.leftTag = None      # left tag in pair
        self.opt = None          # options associated with left tag
        self.tag = None          # type of tag pair
        self.rightTag = None     # right tag in pair
        self.end = None          # position of right side of tag in html
        self.unescape = unescape # should escaped text be converted?

        # opening tag in pair is first tag in queue
        self.leftTag = self.tags.popleft()
        self.opt = self.leftTag.opt
        self.tag = self.leftTag.tag

        # if tag is self-closing, there is no closing tag
        if self.leftTag.isSelfClosing:
            self.rightTag = None
            self.end = self.leftTag.end

        # otherwise search for the closing tag
        else:

            # search for closing tag.  everything until the closing tag is
            # a child of the current tag pair
            while self.tags[0].tag != self.tag or not self.tags[0].isClosingTag:
                self.pushText()
                self.pushTag()

            # consume any text between last child and closing tag
            self.pushText()

            # attach closing tag and its position in input html
            self.rightTag = self.tags.popleft()
            self.end = self.rightTag.end

    def pushTag(self):
        """Add a tag pair to list of children"""
        self.children.append(TagPair(self.tags, self.inhtml))

    def pushText(self):
        """Add text to list of children"""
        txt = self.inhtml[ self.position() : self.tags[0].start ].lstrip().rstrip()
        if self.unescape:
            txt = txt\
                .replace('&apos;' , "'" )\
                .replace('&#39;'  , "'" )\
                .replace('&quot;' , '"' )\
                .replace('&gt;'   , '>' )\
                .replace('&lt;'   , '<' )\
                .replace('&amp;'  , '&' )
        if len(txt) > 0:
            self.children.append(txt)

    def position(self):
        """Return the index of the most recently consumed tag"""
        lastTag = self.children[-1] if len(self.children) > 0 else self.leftTag
        return lastTag.end

    def html(self):
        """Return an HTML representation of the tag pair"""
        opt = ''.join([' %s="%s"'%x for x in self.opt.items()])
        if self.leftTag.isSelfClosing:
            left = "<" + self.tag + opt + "/>"
            inner = ''
            right = ''
        else:
            left = "<" + self.tag + opt + ">"
            right = "</" + self.tag + ">"
        return left + inner + right

    def first(self,key):
        """Return first matching child"""
        matches = self.__getitem__(key)
        if len(matches) > 0:
            return matches[0]
        else:
            return None

    def isType(self, tag):
        """Return true if tag pair is of specified type"""
        return self.tag == tag

    def hasID(self, id):
        """Return true if tag pair has specified ID"""
        return 'id' in self.opt and self.opt['id'] == id

    def __getitem__(self,key):
        """Return a matching child"""
        if '#' in key:
            tag,id = key.split('#',1)
            return [c for c in self.children if isinstance(c,TagPair) and c.isType(tag) and c.hasID(id)][0]
        else:
            return [c for c in self.children if isinstance(c,TagPair) and c.isType(key)]

    def __repr__(self):
        """String representation of TagPair"""
        txt = [self.leftTag.__repr__()]
        for i,c in enumerate(self.children):
            if isinstance(c,TagPair):
                s = c.leftTag.__repr__()
            else:
                if len(c) > 74:
                    c = c[:70] + ' ...'
                s = c.__repr__()
            txt.append('  %d: %s'%(i,s))
        return '\n'.join(txt)

    @staticmethod
    def fromHTML(html=None, file=None):
        """Convert an html string or file into a TagPair"""
        assert html is not None or file is not None, "Either string or file must be specified"
        if html is None:
            with open(file, 'rt') as F:
                html = F.read()
        if html.startswith('<!DOCTYPE html>'):
            html = re.sub(r'<!DOCTYPE html>\s*', '', html)
        tags = deque(Tag(m) for m in ParserHelpers.Tag.finditer(html))
        return TagPair(tags, html)

################################################################################