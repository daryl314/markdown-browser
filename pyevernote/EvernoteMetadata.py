import os, re, json

################################################################################

class EvernoteMetadata(object):
    """Container for evernote synchronization metadata"""

    def __init__(self, syncdata):
        assert os.path.isdir(syncdata)
        assert os.path.isfile(os.path.join(syncdata, 'metadata.json'))

        # load metadata
        self.syncdata = syncdata
        with open(os.path.join(syncdata, 'metadata.json'), 'rt') as F:
            self.metadata = json.load(F)

        # extract metadata.  use history so most recent version is reflected
        self.tags = {}
        for tag in sorted(self.metadata['tags'], key=lambda t: t['updateSequenceNum']):
            self.tags[tag['guid']] = tag
        self.notebooks = {}
        for nb in sorted(self.metadata['notebooks'], key=lambda n: n['updateSequenceNum']):
            self.notebooks[nb['guid']] = nb
        self.notes = {}
        for note in sorted(self.metadata['notes'], key=lambda n: n['updateSequenceNum']):
            self.notes[note['guid']] = EvernoteNote(note, self.tags, self.notebooks, self.syncdata)

################################################################################

class EvernoteNote(object):

    def __init__(self, note, tags, notebooks, syncdata):
        self.note = note
        self.tags = [] if note['tagGuids'] is None else [tags[g]['name'] for g in note['tagGuids']]
        self.notebook = notebooks[note['notebookGuid']]['name']
        self.location = os.path.join(syncdata, 'notes', note['guid'])

    def __repr__(self):
        return 'title: {},  notebook: {},  tags: {}'.format(self.note['title'], self.notebook, self.tags)

    @property
    def deleted(self):
        return self.note['deleted'] is not None

    @property
    def title(self):
        return self.note['title']

    @property
    def escapedtitle(self):
        return self.title.replace('/', '%2f')

    def content(self):
        with open(os.path.join(self.location, '%d.xml' % self.note['updateSequenceNum']), 'rt') as F:
            return F.read()

    def textContent(self):
        return self.markdownContent(self.content())

    @classmethod
    def markdownContent(cls, note_xml):
        a = note_xml.find('>', note_xml.find('<en-note')) + 1
        b = note_xml.find('</en-note>', a)
        return cls.clearNoteFormatting(note_xml[a:b])

    @staticmethod
    def clearNoteFormatting(en_note):
        """Convert Evernote note content to plain text"""
        assert isinstance(en_note, str)  # assuming we are working with an ascii string, not unicode
        en_note = re.sub(r'\s*<span.*?>([\S\s]*?)<\/span>\s*', r'\1', en_note)  # clear span tags
        en_note = en_note.replace('\n', '')                                     # clear newlines
        en_note = re.sub(r'<\/div>[\s\n]*<div>', r'</div><div>', en_note)       # clear whitespace between div tags
        en_note = re.sub(r'<div><br.*?><\/div>', r'</div><div>', en_note)       # convert <div><br/></div> to <div></div>
        en_note = re.sub(r'(<\/?div>){1,2}', r'\n', en_note)                    # convert <div> boundaries to newlines
        en_note = re.sub(r'<br.*?>', r'\n', en_note)                            # convert <br> to newlines
        en_note = re.sub(r'<.*?>', r'', en_note)                                # strip any remaining tags
        # en_note = en_note.replace(u'\u00A0', ' ')                               # non-breaking spaces to spaces
        en_note = en_note.replace('\xc2\xa0', ' ')                              # non-breaking spaces to spaces
        en_note = en_note.replace('&nbsp;'  , ' ')                              # &nbsp; -> ' '
        en_note = en_note.replace('&lt;'    , '<')                              # &lt;   -> '<'
        en_note = en_note.replace('&gt;'    , '>')                              # &gt;   -> '>'
        en_note = en_note.replace('&apos;'  , "'")                              # &apos; -> "'"
        en_note = en_note.replace('&quot;'  , '"')                              # &quot; -> '"'
        en_note = en_note.replace('&#124;'  , '|')                              # &#124; -> '|'
        en_note = en_note.replace('&amp;'   , '&')                              # &amp;  -> '&'
        en_note = re.sub(r'^\n', '', en_note)                                   # clear leading newline
        return en_note

################################################################################
