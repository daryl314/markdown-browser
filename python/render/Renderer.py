from .VCDarkScheme import VCDarkScheme

class Renderer(object):

    def __init__(self, scheme=VCDarkScheme):
        self.CONFIG = scheme.CONFIG

    def getStyle(self, key):
        opt = self.CONFIG['default'].copy()
        opt.update(**self.CONFIG[key])
        return opt

    def render(self, tt):
        raise NotImplementedError("Implement in subclass")