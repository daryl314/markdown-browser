import sys
import os
import subprocess

from pyevernote.EvernoteMetadata import EvernoteMetadata, ActionEnum


class GitGenerator(ActionEnum.Visitor):
    """Visitor class to convert note history entries to git actions"""

    def __init__(self, outdir):
        super(GitGenerator, self).__init__()
        self.outdir = outdir
        if not os.path.isdir(outdir):
            os.mkdir(outdir)
        else:
            subprocess.check_call(['rm', '-rf', outdir])
            os.mkdir(outdir)
        self.git('init')

    def git(self, *cmd):
        args = ['git', '-C', self.outdir] + list(cmd)
        print('==> {}'.format(' '.join(args)))
        return subprocess.check_call(args)

    def visitAll(self, actions):
        for action in actions:
            self.visit(action)

    def visit(self, action):
        print(action)
        noteFile = os.path.join(self.outdir, action.note.mdFile)
        content = action.note.textContent()
        super(GitGenerator, self).visit(action.action, action, noteFile, content)

    def visitCreated(self, action, noteFile, content):
        if not os.path.isdir(os.path.dirname(noteFile)):
            os.mkdir(os.path.dirname(noteFile))
        with open(noteFile, 'wt') as F:
            F.write(content)
        self.git('add', action.note.mdFile)
        self.git('commit', '--date', action.note.updatedTime.isoformat(), '-m', 'Adding {}'.format(action.note.title))

    def visitDeleted(self, action, noteFile, content):
        self.git('rm', action.note.mdFile)
        self.git('commit', '--date', action.note.deletedTime.isoformat(), '-m', 'Deleting {}'.format(action.note.title))

    def visitRenamed(self, action, noteFile, content):
        self.git('mv', action.extra, action.note.mdFile)
        with open(noteFile, 'wt') as F:
            F.write(content)
        self.git('add', action.note.mdFile)
        self.git('commit', '--date', action.note.updatedTime.isoformat(), '-m', 'Renaming {} --> {}'.format(action.extra, action.note.title))

    def visitUpdated(self, action, noteFile, content):
        with open(noteFile, 'rt') as F:
            old_content = F.read()
        if content != old_content:
            with open(noteFile, 'wt') as F:
                F.write(action.note.textContent())
            self.git('add', action.note.mdFile)
            self.git('commit', '--date', action.note.updatedTime.isoformat(), '-m', 'Updating {}'.format(action.note.title))

def toGit(syncdata, outdir):
    """Convert Evernote metadata in specified location to git repository in specified location"""
    meta = EvernoteMetadata(syncdata)
    GitGenerator(outdir).visitAll(meta.cleanHistory())

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("USAGE: python -m pyevernote.EvernoteToGit syncData gitDir")
        sys.exit(1)
    toGit(sys.argv[1], sys.argv[2])