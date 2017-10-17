#!/usr/bin/env python

import sys
import math
import argparse

cssnames = {
    "black":0x000000,
    "silver":0xc0c0c0,
    "gray":0x808080,
    "white":0xffffff,
    "maroon":0x800000,
    "red":0xff0000,
    "purple":0x800080,
    "fuchsia":0xff00ff,
    "green":0x008000,
    "lime":0x00ff00,
    "olive":0x808000,
    "yellow":0xffff00,
    "navy":0x000080,
    "blue":0x0000ff,
    "teal":0x008080,
    "aqua":0x00ffff,
    "orange":0xffa500,
    "aliceblue":0xf0f8ff,
    "antiquewhite":0xfaebd7,
    "aquamarine":0x7fffd4,
    "azure":0xf0ffff,
    "beige":0xf5f5dc,
    "bisque":0xffe4c4,
    "blanchedalmond":0xffebcd,
    "blueviolet":0x8a2be2,
    "brown":0xa52a2a,
    "burlywood":0xdeb887,
    "cadetblue":0x5f9ea0,
    "chartreuse":0x7fff00,
    "chocolate":0xd2691e,
    "coral":0xff7f50,
    "cornflowerblue":0x6495ed,
    "cornsilk":0xfff8dc,
    "crimson":0xdc143c,
    "cyan":0x00ffff,
    "darkblue":0x00008b,
    "darkcyan":0x008b8b,
    "darkgoldenrod":0xb8860b,
    "darkgray":0xa9a9a9,
    "darkgreen":0x006400,
    "darkgrey":0xa9a9a9,
    "darkkhaki":0xbdb76b,
    "darkmagenta":0x8b008b,
    "darkolivegreen":0x556b2f,
    "darkorange":0xff8c00,
    "darkorchid":0x9932cc,
    "darkred":0x8b0000,
    "darksalmon":0xe9967a,
    "darkseagreen":0x8fbc8f,
    "darkslateblue":0x483d8b,
    "darkslategray":0x2f4f4f,
    "darkslategrey":0x2f4f4f,
    "darkturquoise":0x00ced1,
    "darkviolet":0x9400d3,
    "deeppink":0xff1493,
    "deepskyblue":0x00bfff,
    "dimgray":0x696969,
    "dimgrey":0x696969,
    "dodgerblue":0x1e90ff,
    "firebrick":0xb22222,
    "floralwhite":0xfffaf0,
    "forestgreen":0x228b22,
    "gainsboro":0xdcdcdc,
    "ghostwhite":0xf8f8ff,
    "gold":0xffd700,
    "goldenrod":0xdaa520,
    "greenyellow":0xadff2f,
    "grey":0x808080,
    "honeydew":0xf0fff0,
    "hotpink":0xff69b4,
    "indianred":0xcd5c5c,
    "indigo":0x4b0082,
    "ivory":0xfffff0,
    "khaki":0xf0e68c,
    "lavender":0xe6e6fa,
    "lavenderblush":0xfff0f5,
    "lawngreen":0x7cfc00,
    "lemonchiffon":0xfffacd,
    "lightblue":0xadd8e6,
    "lightcoral":0xf08080,
    "lightcyan":0xe0ffff,
    "lightgoldenrodyellow":0xfafad2,
    "lightgray":0xd3d3d3,
    "lightgreen":0x90ee90,
    "lightgrey":0xd3d3d3,
    "lightpink":0xffb6c1,
    "lightsalmon":0xffa07a,
    "lightseagreen":0x20b2aa,
    "lightskyblue":0x87cefa,
    "lightslategray":0x778899,
    "lightslategrey":0x778899,
    "lightsteelblue":0xb0c4de,
    "lightyellow":0xffffe0,
    "limegreen":0x32cd32,
    "linen":0xfaf0e6,
    "magenta":0xff00ff,
    "mediumaquamarine":0x66cdaa,
    "mediumblue":0x0000cd,
    "mediumorchid":0xba55d3,
    "mediumpurple":0x9370db,
    "mediumseagreen":0x3cb371,
    "mediumslateblue":0x7b68ee,
    "mediumspringgreen":0x00fa9a,
    "mediumturquoise":0x48d1cc,
    "mediumvioletred":0xc71585,
    "midnightblue":0x191970,
    "mintcream":0xf5fffa,
    "mistyrose":0xffe4e1,
    "moccasin":0xffe4b5,
    "navajowhite":0xffdead,
    "oldlace":0xfdf5e6,
    "olivedrab":0x6b8e23,
    "orangered":0xff4500,
    "orchid":0xda70d6,
    "palegoldenrod":0xeee8aa,
    "palegreen":0x98fb98,
    "paleturquoise":0xafeeee,
    "palevioletred":0xdb7093,
    "papayawhip":0xffefd5,
    "peachpuff":0xffdab9,
    "peru":0xcd853f,
    "pink":0xffc0cb,
    "plum":0xdda0dd,
    "powderblue":0xb0e0e6,
    "rosybrown":0xbc8f8f,
    "royalblue":0x4169e1,
    "saddlebrown":0x8b4513,
    "salmon":0xfa8072,
    "sandybrown":0xf4a460,
    "seagreen":0x2e8b57,
    "seashell":0xfff5ee,
    "sienna":0xa0522d,
    "skyblue":0x87ceeb,
    "slateblue":0x6a5acd,
    "slategray":0x708090,
    "slategrey":0x708090,
    "snow":0xfffafa,
    "springgreen":0x00ff7f,
    "steelblue":0x4682b4,
    "tan":0xd2b48c,
    "thistle":0xd8bfd8,
    "tomato":0xff6347,
    "turquoise":0x40e0d0,
    "violet":0xee82ee,
    "wheat":0xf5deb3,
    "whitesmoke":0xf5f5f5,
    "yellowgreen":0x9acd32,
    "rebeccapurple":0x663399
}

################################################################################

class BaseColor(object):
    """Base class for color handling"""

    def __init__(self, color):
        """Initialize rgb values with color name, integer, or hex string"""
        self.r,self.g,self.b = BaseColor.toRGB(color)
    
    def distance(self, r, g, b):
        """Distance between object rgb and provided rgb"""
        return math.sqrt((r-self.r)**2 + (g-self.g)**2 + (b-self.b)**2)

    def render(self, txt):
        """Render text using color for foreground"""
        print self.escapeFG() + txt + self.escapeClear(),

    @staticmethod
    def resolveIndices(r, g, b, boundaries):
        """Identify the boundaries associated with rgb values"""
        return [BaseColor.resolveIndex(c,boundaries) for c in r,g,b]

    @staticmethod
    def resolveIndex(color, boundaries):
        """Identify the color boundary index closest to the provided value"""

        # if a list or tuple was passed, recurse
        if isinstance(color,list) or isinstance(color,tuple):
            return [BaseColor.resolveIndex(c,boundaries) for c in color]
        
        # if index is zero, return the first boundary
        if color == 0:
            return 0
        
        # otherwise iterate over boundaries
        else:
            for i in range(1,len(boundaries)):

                # if color matches a boundary, return the boundary
                if color == boundaries[i]:
                    return i

                # if color is between boundaries, return the closer boundary
                elif color < boundaries[i]:
                    if boundaries[i] - color < color - boundaries[i-1]:
                        return i
                    else:
                        return i - 1

            # otherwise return the final boundary
            return len(boundaries)-1
        
    @staticmethod
    def toRGB(color):
        """Convert a color name, integer, or hex string to int8 [r,g,b]"""

        # convert a css name to hex string
        if isinstance(color,str) and color in cssnames:
            color = cssnames[color]

        # convert integer to hex string
        if isinstance(color, int):
            color = '%06x' % color

        # convert hex string to rgb
        if isinstance(color, str):
            return [
                int(c,base=16) 
                for c in [color[-6:-4], color[-4:-2], color[-2:]]
            ]

        # otherwise an error
        else:
            raise RuntimeError('Invalid input!')

    @staticmethod
    def escapeClear():
        """Clear any ANSI escape codes"""
        return "\033[0m"

    @staticmethod
    def underline():
        """Return ANSI underline code"""
        return "\033[4m"

    @staticmethod
    def bold():
        """Return ANSI bold code"""
        return "\033[1m"

    @staticmethod
    def getHue(r,g,b):
        """Return the numeric hue associated with an rgb value"""
        if isinstance(r, int):
            r,g,b = r/255.0,g/255.0,b/255.0
        M = max(r,g,b)
        m = min(r,g,b)
        C = M - m
        if C == 0:
            return 0
        elif M == r:
            return 60*((g-b)/C % 6)
        elif M == g:
            return 60*((b-r)/C + 2)
        else:
            return 60*((r-g)/C + 4)

################################################################################

class Color16(BaseColor):

    # mapping from color names to indices
    colorTable = {
        'black'   : 0,
        'red'     : 1,
        'green'   : 2,
        'yellow'  : 3,
        'blue'    : 4,
        'magenta' : 5,
        'cyan'    : 6,
        'white'   : 7
    }

    # lookup table from normalized rgb to indices
    # keys: are r,g,b values the high value?
    # values: corresponding low8/high8 color indices
    lookup = {
        (0,0,0) : [0,0],
        (1,0,0) : [1,9],
        (0,1,0) : [2,10],
        (1,1,0) : [3,11],
        (0,0,1) : [4,12],
        (1,0,1) : [5,13],
        (0,1,1) : [6,14],
        (1,1,1) : [8,14]
    }

    # r/g/b value for a 1 in lookup table
    loBoundaries = [0,128]  # low 8 have rgb values of 0 or 128
    hiBoundaries = [0,255]  # high 8 have rgb values of 0 or 255

    def __init__(self, color):
        super(Color16,self).__init__(color)

        # identify the closest low8 and high8 color boundaries
        lo = self.resolveIndices(self.r, self.g, self.b, Color16.loBoundaries)
        hi = self.resolveIndices(self.r, self.g, self.b, Color16.hiBoundaries)

        # convert boundaries to numerical values
        lob = [Color16.loBoundaries[x] for x in lo]
        hib = [Color16.hiBoundaries[x] for x in hi]

        # distance to best low8, high8, and silver colors
        dlo = self.distance(*lo)
        dhi = self.distance(*hi)
        dsi = self.distance(192,192,192) # color 7 is silver

        # low8 is best match
        if dlo <= dhi and dlo <= dsi:
            self.index = Color16.lookup[tuple(lo)][0]
            self.renderRGB = lob

        # high8 is best match
        elif dhi <= dlo and dhi <= dsi:
            self.index = Color16.lookup[tuple(hi)][1]
            self.renderRGB = hib
        
        # silver is best match
        else:
            self.index = 7
            self.renderRGB = (192,192,192)

    def escapeFG(self):
        """Return escape code for colored foreground"""
        if self.index >= 8:
            return "\033[%dm" % (self.index-8+90)
        else:
            return "\033[%dm" % (self.index+30)

    def escapeBG(self):
        """Return escape code for colored background"""
        if self.index >= 8:
            return "\033[%dm" % (self.index-8+100)
        else:
            return "\033[%dm" % (self.index+40)

    @staticmethod
    def setFG(name, bold=False):
        """Escape code for colored foreground given a 16-color index"""
        c = Color16.colorTable[ name.lower() ]
        if bold:
            return "\033[%dm" % (c+90)
        else:
            return "\033[%dm" % (c+30)

    @staticmethod
    def setBG(name, bold=False):
        """Escape code for colored background given a 16-color index"""
        c = Color16.colorTable[ name.lower() ]
        if bold:
            return "\033[%dm" % (c+100)
        else:
            return "\033[%dm" % (c+40)

################################################################################

class Color256(BaseColor):

    cubeBoundaries = [0, 95, 135, 175, 215, 255]
    grayBoundaries = range(8,248,10) + [255] # 232 --> 255, 231

    def __init__(self,color):
        super(Color256,self).__init__(color)

        # rgb values and color index for best match in 16-color pallette
        color16 = Color16(color)
        rgb16 = color16.renderRGB
        idx16 = color16.index

        # rgb values and color index for best match in gray gradient
        idx = self.resolveIndex((self.r + self.b + self.g)/3, self.grayBoundaries)
        if idx == len(self.grayBoundaries) - 1:
            idxGray = 231
            rgbGray = (255,255,255)
        else:
            idxGray = idx + 232
            rgbGray = (self.grayBoundaries[idx],)*3

        # rgb values and color index for best match in color cube
        r,g,b = self.resolveIndices(self.r, self.g, self.b, self.cubeBoundaries)
        rgbCube = [self.cubeBoundaries[i] for i in r,g,b]
        idxCube = 16 + r*6*6 + g*6 + b

        # distances to each model
        d16   = self.distance(*rgb16  )
        dCube = self.distance(*rgbCube)
        dGray = self.distance(*rgbGray)

        # set 256 color index to the closest model
        if d16 <= dCube and d16 <= dGray:
            self.index = idx16
        elif dCube <= d16 and dCube <= dGray:
            self.index = idxCube
        else:
            self.index = idxGray

    def escapeFG(self):
        """Return escape code for colored foreground"""
        return self.setFG(self.index)

    def escapeBG(self):
        """Return escape code for colored background"""
        return self.setBG(self.index)

    @staticmethod
    def setFG(index):
        """Escape code for colored foreground given a 256-color index"""
        return "\033[38;5;%dm" % index

    @staticmethod
    def setBG(index):
        """Escape code for colored background given a 256-color index"""
        return "\033[48;5;%dm" % index

    @staticmethod
    def printChart():
        """Display a 256-color chart"""
        for i in range(256):
            sys.stdout.write(Color256.setFG(15))
            sys.stdout.write(Color256.setBG(i))
            sys.stdout.write(" %03d " % i)
            sys.stdout.write(Color256.setBG(0))
            sys.stdout.write(Color256.setFG(i))
            print " %03d "%(i),
            if i < 16 and i % 8 == 7:
                print "\033[0m"
            elif i > 16 and (i-16) % 6 == 5:
                print "\033[0m"
            if i in range(15,255,36):
                print

################################################################################

class Color24Bit(BaseColor):

    def escapeFG(self):
        """Return escape code for colored foreground"""
        return self.setFG(self.r, self.g, self.b)

    def escapeBG(self):
        """Return escape code for colored background"""
        return self.setBG(self.r, self.g, self.b)

    @staticmethod
    def setFG(r, g, b):
        """Escape code for colored foreground given 24-bit r,g,b"""
        return "\033[38;2;%d;%d;%dm" % (r,g,b)

    @staticmethod
    def setBG(r, g, b):
        """Escape code for colored background given 24-bit r,g,b"""
        return "\033[48;2;%d;%d;%dm" % (r,g,b)

################################################################################

if __name__ == '__main__':

    # parse command line arguments
    parser = argparse.ArgumentParser()
    parser.add_argument('--chart256', action='store_true', help='Generate 256 color chart')
    parser.add_argument('--colornames', action='store_true', help='Display CSS color names')
    parser.add_argument('--lookup256', help='Look up a 256 color equivalent to a color name or hex code')
    args = parser.parse_args()

    # show help if no options were passed
    if not args.chart256 and not args.colornames and args.lookup256 is None:
        parser.print_help()

    # create a 256-color chart
    if args.chart256:
        Color256.printChart()
        print

    # css color names sorted by hue
    def cssHue(name):
        return Color256.getHue(*BaseColor.toRGB(name))
    names = cssnames.keys()
    names.sort(key=cssHue)

    # display renderings of css colors
    if args.colornames:
        fmt = '%-{}s'.format(max(map(len, names)))
        print BaseColor.underline() + fmt%'24-bit' , fmt%'256-Color' , fmt%'16-Color'
        for k in names:
            Color24Bit(k).render(fmt % k)
            Color256(k)  .render(fmt % k)
            Color16(k)   .render(fmt % k)
            print

    # look up a 256-color equivalent to a color name or hex code
    if args.lookup256 is not None:
        print "Index for %s => %d" % (args.lookup256.__repr__(), Color256(args.lookup256).index)