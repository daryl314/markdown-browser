import os
import re
import json
import datetime
import collections
from pycmark.util.enum import enum


################################################################################

ActionEnum = enum(['Created', 'Renamed', 'Updated', 'Deleted'], name='ActionEnum')

################################################################################

class Action(collections.namedtuple('Action', ['time', 'action', 'note', 'extra'])):
    """Container class for note history updates"""

    def __repr__(self):
        t = self.time.strftime('%Y-%m-%d %H:%M')
        action = ActionEnum[self.action]
        if self.action != ActionEnum.Renamed:
            return '%s   %s   %s' % (t, action, self.note.mdFile.__repr__())
        else:
            return '%s   %s   %s -> %s' % (t, action, self.extra.__repr__(), self.note.mdFile.__repr__())

    @property
    def guid(self):
        return self.note.note['guid']

################################################################################

class HistoryHandler(ActionEnum.Visitor):
    """Visitor class to process EvernoteMetadata note history"""

    def __init__(self, interleave=False):
        super(HistoryHandler, self).__init__()
        self.active_notes = {}
        self.ignored = {}
        self.interleave = interleave
        self.history = []

    def _add(self, action):
        if action.note.mdFile not in self.active_notes:
            self.active_notes[action.note.mdFile] = {action.guid}
        else:
            self.active_notes[action.note.mdFile].add(action.guid)
        self.history.append(action)

    def visitCreated(self, action):
        self._add(action)

    def visitDeleted(self, action):
        ref = self.active_notes[action.note.mdFile]
        if len(ref) == 1:  # only one reference, so delete is unambiguous
            del self.active_notes[action.note.mdFile]
            self.history.append(action)
        else:  # ambiguous delete
            ref.remove(action.guid)
            if self.interleave:  # just ignore deletion if interleaving
                pass
            else:  # otherwise strip duplicate note from history
                self.history = [h for h in self.history if h.guid != action.guid]

    def visitRenamed(self, action):
        ref = self.active_notes[action.extra]
        if len(ref) == 1:
            del self.active_notes[action.extra]
        else:
            raise NotImplementedError("Logic not yet implemented for unambiguous rename")
        self._add(action)

    def visitUpdated(self, action):
        self.history.append(action)

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

    def history(self, tagFilter='markdown', ignore_empty=True):
        """Sequence of Actions reflecting note history"""
        history = []
        for guid, note in self.notes.items():
            if tagFilter is None or tagFilter in note.tags:
                versions = sorted(note.versions(), key=lambda v: v.updatedTime)
                if ignore_empty:
                    while len(versions) > 0 and versions[0].textContent() == '':
                        versions = versions[1:]
                    if len(versions) == 0:
                        continue
                history.append(Action(note.createdTime, ActionEnum.Created, versions[0], None))
                previous = versions[0]
                for i, v in enumerate(versions[1:]):
                    if v.mdFile != previous.mdFile:
                        history.append(Action(v.updatedTime, ActionEnum.Renamed, v, previous.mdFile))
                    else:
                        history.append(Action(v.updatedTime, ActionEnum.Updated, v, None))
                    previous = v
                if note.deleted:
                    history.append(Action(note.deletedTime, ActionEnum.Deleted, versions[-1], None))
        return history

    def cleanHistory(self, sort=True, **kwargs):
        """Sequence of Actions reflecting note history with duplicates stripped"""
        history = self.history(**kwargs)
        if sort:
            history.sort()
        hh = HistoryHandler()
        for entry in history:
            hh.visit(entry.action, entry)
        return hh.history

################################################################################

class EvernoteNote(object):

    def __init__(self, note, tags, notebooks, syncdata, title=None, updated=None, sequence=None):
        self.note = note
        self._tags = tags
        self._notebooks = notebooks
        self._syncdata = syncdata
        self.updated = note['updated'] if updated is None else updated
        self.sequence = note['updateSequenceNum'] if sequence is None else sequence
        self.title = note['title'] if title is None else title

    def __repr__(self):
        return 'title: {},  notebook: {},  tags: {}'.format(self.title, self.notebook, self.tags)

    @property
    def tags(self):
        return [] if self.note['tagGuids'] is None else [self._tags[g]['name'] for g in self.note['tagGuids']]

    @property
    def notebook(self):
        return self._notebooks[self.note['notebookGuid']]['name']

    @property
    def location(self):
        return os.path.join(self._syncdata, 'notes', self.note['guid'])

    @property
    def deleted(self):
        return self.note['deleted'] is not None

    @property
    def escapedtitle(self):
        return self.title.replace('/', '%2f')

    @property
    def createdTime(self):
        return datetime.datetime.utcfromtimestamp(self.note['created'] / 1000.0)

    @property
    def updatedTime(self):
        return datetime.datetime.utcfromtimestamp(self.updated / 1000.0)

    @property
    def deletedTime(self):
        return datetime.datetime.utcfromtimestamp(self.note['deleted'] / 1000.0)

    @property
    def mdFile(self):
        return os.path.join(self.notebook, self.title.replace('/', '_') + '.md')

    def versions(self):
        out = [self]
        with open(os.path.join(self.location, 'versions.json'), 'rt') as F:
            for v in json.load(F):
                out.append(self.__class__(self.note, self._tags, self._notebooks, self._syncdata,
                                          title=v['title'], updated=v['updated'], sequence=v['updateSequenceNum']))
        return out

    def content(self):
        with open(os.path.join(self.location, '%d.xml' % self.sequence), 'rt') as F:
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
        en_note = re.sub(r' +\n', '\n', en_note)                               # clear trailing whitespace
        return en_note

################################################################################
