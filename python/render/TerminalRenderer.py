class TerminalRenderer(object):

    # https://github.com/tomasiser/vim-code-dark/blob/master/README.md
    class VCDark:
        BG = 0x1e1e1e
        GRAY = 0x808080
        FG = 0xd4d4d4
        LIGHTBLUE = 0x9cdcfe
        BLUE = 0x569cd6
        BLUEGREEN = 0x4ec9b0
        GREEN = 0x608b4e
        LIGHTGREEN = 0xb5cea8
        YELLOW = 0xdcdcaa
        YELLOWORANGE = 0xd7ba7d
        ORANGE = 0xce9178
        LIGHTRED = 0xd16969
        RED = 0xF44747
        PINK = 0xc586c0
        VIOLET = 0x646695
        WHITE = 0xffffff

    CONFIG = {
        'body'          : {},
        'heading1'      : {'fg': VCDark.WHITE, 'bg': VCDark.RED, 'b': True},
        'heading'       : {'fg': VCDark.RED},
        'table_header'  : {'fg': VCDark.WHITE, 'bg': VCDark.BLUE},
        'latex_inline'  : {'fg': VCDark.LIGHTGREEN},
        'latex_block'   : {'fg': VCDark.LIGHTGREEN},
        'strikethrough' : {'fg': VCDark.GRAY},
        'strong'        : {'fg': VCDark.WHITE, 'b': True},
        'emph'          : {'u': True},
        'code_block'    : {'fg': VCDark.LIGHTBLUE},
        'code'          : {'fg': VCDark.LIGHTBLUE},
        'block_quote'   : {'fg': VCDark.YELLOW},
        'image'         : {'fg': VCDark.BLUE, 'u': True},
        'link'          : {'fg': VCDark.BLUE, 'u': True},
    }

    @classmethod
    def render(cls, tt):
        tag = tt.simplifyStack()
        if tag in cls.CONFIG:
            return cls._render(tt, **cls.CONFIG[tag])
        else:
            raise RuntimeError("Unrecognized style tag: {}".format(tag))

    @staticmethod
    def _render(tt, fg=VCDark.FG, bg=VCDark.BG, b=False, i=False, u=False):
        return tt.render24(tt.text, fg=fg, bg=bg, b=b, i=i, u=u)
