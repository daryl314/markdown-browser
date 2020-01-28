from .Renderer import Renderer


class TerminalRenderer(Renderer):

    def render(self, tt):
        tag = tt.simplifyStack()
        if tag in self.CONFIG:
            return tt.render24(tt.text, **self.getStyle(tag))
        else:
            raise RuntimeError("Unrecognized style tag: {}".format(tag))


if __name__ == '__main__':
    import argparse
    import subprocess
    import signal
    import sys
    from ..TaggedCmarkDocument import TaggedTextDocument
    from ...util.TypedTree import TypedTree

    # parse input arguments
    parser = argparse.ArgumentParser()
    parser.add_argument('infile', help="json file to process")
    parser.add_argument('--width', help="Output width", type=int, default=80)
    parser.add_argument('--auto-width', action="store_true", help="Adjust to terminal width")
    args = parser.parse_args()

    # adjust to terminal width?
    if args.auto_width:
        args.width = int(subprocess.check_output(['tput', 'cols']))

    # read input data
    txt = open(args.infile, 'rt').read()
    assert args.infile.endswith('.json') and txt[0] == '{'

    # handler to stop processing if stdout is closed
    def sigpipe_handler(e):
        sys.exit(0)

    # render tagged text json
    tt = TypedTree._fromjson(txt)
    signal.signal(signal.SIGPIPE, sigpipe_handler)
    doc = TaggedTextDocument.fromAST(tt, width=args.width)
    doc.render(TerminalRenderer().render)
