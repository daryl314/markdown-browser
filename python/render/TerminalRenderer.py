from .Renderer import Renderer

class TerminalRenderer(Renderer):

    def render(self, tt):
        tag = tt.simplifyStack()
        if tag in self.CONFIG:
            return tt.render24(tt.text, **self.getStyle(tag))
        else:
            raise RuntimeError("Unrecognized style tag: {}".format(tag))
