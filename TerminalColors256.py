import struct
import sys
import math

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
    def __init__(self, color):
        self.r,self.g,self.b = BaseColor.toRGB(color)
    
    def resolveIndices(self, boundaries):
        return [self.resolveIndex(c,boundaries) for c in self.r,self.g,self.b]

    def resolveIndex(self, color, boundaries):
        if isinstance(color,list) or isinstance(color,tuple):
            return [self.resolveIndex(c,boundaries) for c in color]
        if color == 0:
            return 0
        else:
            for i in range(1,len(boundaries)):
                if color == boundaries[i]:
                    return i
                elif color < boundaries[i]:
                    if boundaries[i] - color < color - boundaries[i-1]:
                        return i
                    else:
                        return i - 1
            return len(boundaries)-1

    def distance(self, r, g, b):
        return math.sqrt((r-self.r)**2 + (g-self.g)**2 + (b-self.b)**2)

    def render(self, txt):
        print self.escapeFG() + txt + self.escapeClear(),

    @staticmethod
    def toRGB(color):
        if isinstance(color,str) and color in cssnames:
            color = cssnames[color]
        if isinstance(color, int):
            color = '%06x' % color
        if isinstance(color, str):
            return [
                int(c,base=16) 
                for c in [color[-6:-4], color[-4:-2], color[-2:]]
            ]
        else:
            raise RuntimeError('Invalid input!')

    @staticmethod
    def escapeClear():
        return "\033[0m"

    @staticmethod
    def underline():
        return "\033[4m"

class Color16(BaseColor):
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

    loLookup = {
        (0,0,0) : 0,
        (1,0,0) : 1,
        (0,1,0) : 2,
        (1,1,0) : 3,
        (0,0,1) : 4,
        (1,0,1) : 5,
        (0,1,1) : 6,
        (1,1,1) : 8
    }

    hiLookup = {
        (0,0,0) : 0,
        (1,0,0) : 9,
        (0,1,0) : 10,
        (1,1,0) : 11,
        (0,0,1) : 12,
        (1,0,1) : 13,
        (0,1,1) : 14,
        (1,1,1) : 15
    }

    loBoundaries = [0,128]
    hiBoundaries = [0,255]

    def __init__(self, color):
        super(Color16,self).__init__(color)
        lo = self.resolveIndices(Color16.loBoundaries)
        hi = self.resolveIndices(Color16.hiBoundaries)
        lob = [Color16.loBoundaries[x] for x in lo]
        hib = [Color16.hiBoundaries[x] for x in hi]
        dlo = self.distance(*lo)
        dhi = self.distance(*hi)
        dsi = self.distance(192,192,192) # color 7 is silver
        if dlo <= dhi and dlo <= dsi:
            self.index = Color16.loLookup[tuple(lo)]
            self.renderRGB = lob
        elif dhi <= dlo and dhi <= dsi:
            self.index = Color16.hiLookup[tuple(lo)]
            self.renderRGB = hib
        else:
            self.index = 7
            self.renderRGB = (192,192,192)

    def escapeFG(self):
        if self.index >= 8:
            return "\033[%dm" % (self.index-8+90)
        else:
            return "\033[%dm" % (self.index+30)

    def escapeBG(self):
        if self.index >= 8:
            return "\033[%dm" % (self.index-8+100)
        else:
            return "\033[%dm" % (self.index+40)

    @staticmethod
    def setFG(name, bold=False):
        c = Color16.colorTable[ name.lower() ]
        if bold:
            return "\033[%dm" % (c+90)
        else:
            return "\033[%dm" % (c+30)

    @staticmethod
    def setBG(name, bold=False):
        c = Color16.colorTable[ name.lower() ]
        if bold:
            return "\033[%dm" % (c+100)
        else:
            return "\033[%dm" % (c+40)

class ColorGray(BaseColor):
    boundaries = range(8,248,10) + [255] # 232 --> 255, 231

    def __init__(self,color):
        super(ColorGray,self).__init__(color)
        idx = self.resolveIndex((self.r + self.b + self.g)/3, ColorGray.boundaries)
        if idx == len(ColorGray.boundaries) - 1:
            self.index = 231
            self.renderRGB = (255,255,255)
        else:
            self.index = idx + 232
            self.renderRGB = (ColorGray.boundaries[idx],)*3

    def escapeFG(self):
        return "\033[38;5;%dm" % self.index

    def escapeBG(self):
        return "\033[48;5;%dm" % self.index

class ColorCube(BaseColor):
    boundaries = [0, 95, 135, 175, 215, 255]
    def __init__(self, color):
        super(ColorCube,self).__init__(color)
        self.r_ = self.resolveIndex(self.r, ColorCube.boundaries)
        self.g_ = self.resolveIndex(self.g, ColorCube.boundaries)
        self.b_ = self.resolveIndex(self.b, ColorCube.boundaries)
        self.renderRGB = [ColorCube.boundaries[i] for i in (self.r_,self.g_,self.b_)]
    def getIndex(self):
        return 16 + self.r_*6*6 + self.g_*6 + self.b_
    def escapeFG(self):
        return "\033[38;5;%dm" % self.getIndex()
    def escapeBG(self):
        return "\033[48;5;%dm" % self.getIndex()
    def display(self):
        i = self.getIndex()
        print "\033[48;5;%dm\033[38;5;15m %03d \033[33;5;0m\033[38;5;%dm %03d "%(i,i,i,i),

class Color256(BaseColor):

    def __init__(self,color):
        super(Color256,self).__init__(color)
        color16 = Color16(color)
        colorCube = ColorCube(color)
        colorGray = ColorGray(color)
        d16 = self.distance(*color16.renderRGB)
        dCube = self.distance(*colorCube.renderRGB)
        dGray = self.distance(*colorGray.renderRGB)
        if d16 <= dCube and d16 <= dGray:
            self.index = color16.index
        elif dCube <= d16 and dCube <= dGray:
            self.index = colorCube.getIndex()
        else:
            self.index = colorGray.index
    
    def escapeFG(self):
        return "\033[38;5;%dm" % self.index

    def escapeBG(self):
        return "\033[48;5;%dm" % self.index

    @staticmethod
    def setBG(index):
        return "\033[48;5;%dm" % index

    @staticmethod
    def setFG(index):
        return "\033[38;5;%dm" % index

class Color24Bit(BaseColor):
    def render(self, txt):
        print "\033[38;2;%d;%d;%dm%s\033[0m" % (self.r,self.g,self.b,txt),

def getHue(r,g,b):
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

def printChart():
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

printChart()
print

def cssHue(name):
    return getHue(*BaseColor.toRGB(name))
names = cssnames.keys()
names.sort(key=cssHue)
fmt = '%-{}s'.format(max(map(len, names)))

for k in names:
    #print BaseColor.underline(),
    Color24Bit(k).render(fmt % k)
    Color256(k)  .render(fmt % k)
    ColorCube(k) .render(fmt % k)
    Color16(k)   .render(fmt % k)
    ColorGray(k) .render(fmt % k)
    print

