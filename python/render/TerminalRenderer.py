from VCDarkScheme import VCDarkScheme

class TerminalRenderer(object):

    def __init__(self, scheme=VCDarkScheme):
        self.CONFIG = scheme.CONFIG

    def render(self, tt):
        tag = tt.simplifyStack()
        if tag in self.CONFIG:
            opt = self.CONFIG['default'].copy()
            opt.update(**self.CONFIG[tag])
            return tt.render24(tt.text, **opt)
        else:
            raise RuntimeError("Unrecognized style tag: {}".format(tag))
