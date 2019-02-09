#!/usr/bin/env python

import sys, os, time, argparse
from collections import namedtuple
from elftools.elf.elffile import ELFFile
from elftools.dwarf.descriptions import _DESCR_DW_ATE
import elftools

################################################################################

class ReportingNode:
    def __repr__(self, indent=0, tabstop=4):
        tab = ' ' * tabstop
        def dumpAttr(x, indent=0, tabstop=4):
            if isinstance(x, ReportingNode):
                return x.__repr__(indent=indent, tabstop=tabstop)
            elif isinstance(x, tuple) and len(x) > 1:
                return '(\n' + ',\n'.join(
                    [tab * (indent + 1) + dumpAttr(el, indent + 1) for el in x]) + '\n' + tab * indent + ')'
            elif isinstance(x, list) and len(x) > 1:
                return '[\n' + ',\n'.join(
                    [tab * (indent + 1) + dumpAttr(el, indent + 1) for el in x]) + '\n' + tab * indent + ']'
            else:
                return x.__repr__()
        a = ['%s=%s' % (k, dumpAttr(v, indent)) for k, v in zip(self._fields, self)]
        return self.__class__.__name__ + '(' + ', '.join(a) + ')'

class AstNode:
    """Container for AST node types"""

    class Structure   (ReportingNode, namedtuple('Structure'  , ['name'    , 'children'                          ])): pass
    class Union       (ReportingNode, namedtuple('Union'      , ['name'    , 'children'                          ])): pass
    class Enumeration (ReportingNode, namedtuple('Enumeration', ['name'    , 'encoding', 'bytes'     , 'children'])): pass
    class Member      (ReportingNode, namedtuple('Member'     , ['name'    , 'type'                              ])): pass
    class Parameter   (ReportingNode, namedtuple('Parameter'  , ['name'    , 'type'                              ])): pass
    class Variable    (ReportingNode, namedtuple('Variable'   , ['name'    , 'type'                              ])): pass
    class Const       (ReportingNode, namedtuple('Const'      , ['name'    , 'type'                              ])): pass
    class Typedef     (ReportingNode, namedtuple('Typedef'    , ['name'    , 'type'                              ])): pass
    class Enumerator  (ReportingNode, namedtuple('Enumerator' , ['name'    , 'value'                             ])): pass
    class Array       (ReportingNode, namedtuple('Array'      , ['name'    , 'type'    , 'dimensions'            ])): pass
    class Subrange    (ReportingNode, namedtuple('Subrange'   , ['ubound'                                        ])): pass
    class Base        (ReportingNode, namedtuple('Base'       , ['encoding', 'bytes'                             ])): pass
    class Pointer     (ReportingNode, namedtuple('Pointer'    , ['type'                                          ])): pass
    class Reference   (ReportingNode, namedtuple('Reference'  , ['name'                                          ])): pass

    class Subroutine(ReportingNode, namedtuple('Subroutine', ['name','type','parameters'])):
        def takesCallback(self):
            """Does the function take a callback?"""
            return any([p.isCallback() for p in self.parameters])

    class Parameter(ReportingNode, namedtuple('Parameter', ['name','type'])):
        def isCallback(self):
            ref = self.type
            while isinstance(ref, AstNode.Typedef):
                ref = ref.type
            return isinstance(ref, AstNode.Pointer) and isinstance(ref.type, AstNode.Subroutine)

################################################################################

class DwarfInfo(object):
    """Container for .dwarf_info section of an ELF file"""
    # ENCODINGS = dict([(k,v[1:-1].capitalize()) for k,v in _DESCR_DW_ATE.items()])

    ########################
    ## BASE FUNCTIONALITY ##
    ########################

    def __init__(self, elf_file):
        self.in_file = elf_file
        # extract DWARF data
        with open(elf_file, 'rb') as F:
            elffile = ELFFile(F)
            assert elffile.has_dwarf_info()
            self.dwarfinfo = elffile.get_dwarf_info()
        # lookup table: ID --> underlying DIE
        self.dieMap = {}
        for cu in self.dwarfinfo.iter_CUs():
            for die in cu.iter_DIEs():
                self.dieMap[die.offset] = die
        # mapping from ID to DIE attributes
        self.dieAttr = dict([(k,self.dieAttributes(v)) for k,v in self.dieMap.items()])

    @staticmethod
    def dieAttributes(die):
        """Return a map of DIE attributes"""
        attr = dict([(k.replace('DW_AT_', ''), v.value) for k,v in die.attributes.items()])
        if 'type' in attr:  # adjust cross-references for compilation unit offset
            attr['type'] += die.cu.cu_offset
        return attr

    @staticmethod
    def dieTag(die):
        """Return a processed tag associated with a DIE"""
        if die.tag is not None:
            return die.tag.replace("DW_TAG_", "").replace('_type', '').capitalize()

    def describeDIE(self, die, writer=sys.stdout):
        """Dump a textual description of a .dwarf_info DIE"""
        n = 0
        if die._parent is not None:
            n = self.describeDIE(die._parent, writer=writer) + 1
        writer.write(' <%s><%x>: Abbrev Number: %s%s\n' % (n, die.offset, die.abbrev_code,
                                                           (' (%s)' % die.tag) if not die.is_null() else ''))
        for attr in die.attributes.values():
            name = attr.name
            if isinstance(name, int):
                name = 'Unknown AT value: %x' % name
            offset = self.dwarfinfo.debug_info_sec.global_offset
            desc = elftools.dwarf.descriptions.describe_attr_value(attr, die, offset)
            writer.write('    <%x>   %-18s: %s\n' % (attr.offset, name, desc))
        return n


    #################
    ## AST SUPPORT ##
    #################

    CLASS_REMAP = {
        'Formal_parameter' : 'Parameter',
        'Subprogram'       : 'Subroutine',
    }
    ARG_REMAP = {
        'bytes' : 'byte_size',
        'ubound': 'upper_bound',
        'value' : 'const_value',
    }
    IGNORED_CHILDREN = {
        'Lexical_block',
        'Label'
    }

    def resolveTypeReference(self, die):
        """Resolve a DIE type cross-reference"""
        # referenced DIE
        ref = self.dieMap[self.dieAttributes(die)['type']]
        # only pointers have recursive cycle issues
        if self.dieTag(die) != 'Pointer':
            return self.dieToAST(ref)
        # follow potential chain of type definitions
        chain = [ref]
        while self.dieTag(chain[-1]) == 'Typedef' and 'type' in self.dieAttributes(chain[-1]):
            chain.append(self.dieMap[self.dieAttributes(chain[-1])['type']])
        # okay to embed the type for something other than a structure or union
        if self.dieTag(chain[-1]) not in {'Structure','Union'}:
            return self.dieToAST(ref)
        # otherwise need a cross-reference to the lowest-level named type in the chain
        lastName = [self.dieAttributes(d)['name'] for d in chain if 'name' in self.dieAttributes(d)][-1]
        return AstNode.Reference(lastName)

    def dieToAST(self, die):
        """Convert a DIE to an AST"""
        tag = self.dieTag(die)
        attr = self.dieAttributes(die)
        children = [self.dieToAST(c) for c in die.iter_children() if self.dieTag(c) not in self.IGNORED_CHILDREN]

        ctor_name = self.CLASS_REMAP.get(tag, tag)
        if not hasattr(AstNode, ctor_name):
            self.describeDIE(die, writer=sys.stderr)
            raise RuntimeError("Unrecognized DIE type: {}".format(tag))
        Ctor = getattr(AstNode, ctor_name)

        kwargs = {}
        for arg in Ctor._fields:
            if arg == 'type' and 'type' in attr:
                kwargs['type'] = self.resolveTypeReference(die)
            elif arg == 'encoding':
                kwargs[arg] = _DESCR_DW_ATE[attr['encoding']].replace('(', '').replace(')', '').capitalize()
            elif arg in attr:
                kwargs[arg] = attr[arg]
            elif arg in self.ARG_REMAP and self.ARG_REMAP[arg] in attr:
                kwargs[arg] = attr[self.ARG_REMAP[arg]]
            elif arg == 'parameters':
                kwargs[arg] = tuple([c for c in children if isinstance(c, AstNode.Parameter)])
            elif arg in {'children','dimensions'}:
                kwargs[arg] = tuple(children)
            elif arg in {'name','type','ubound'}:
                kwargs[arg] = None
            else:
                raise RuntimeError("Unrecognized constructor argument: {}".format(arg))

        return Ctor(**kwargs)

    @staticmethod
    def followTypedefs(element):
        """Follow potential typedefs in an element"""
        while isinstance(element, AstNode.Typedef):
            element = element.type
        return element

    def typeMap(self):
        """Return a dict mapping type names to associated AST's"""
        out = {}
        for die in self.dieMap.values():
            tag = self.dieTag(die)
            attr = self.dieAttributes(die)

            if tag is not None \
                    and tag in {'Subprogram', 'Structure', 'Typedef', 'Enumeration'} \
                    and 'name' in attr:
                if tag == 'Subprogram' and 'external' not in attr:
                    continue  # can reuse function names so only look at exported functions

                el = self.dieToAST(die)
                name = el.name
                el = self.followTypedefs(el)  # follow typedef to get at underlying type
                if name not in out:
                    out[name] = el
                else:
                    old = out[name]
                    if old == el:
                        # skip a repeated entry
                        pass
                    elif isinstance(el, AstNode.Structure) and isinstance(old, AstNode.Structure):
                        if old.name == el.name and len(old.children) == 0:
                            # replace an empty reference with a reference w/ children
                            out[name] = el
                        elif old.name == el.name and len(el.children) == 0:
                            # don't replace a reference w/ children with an empty reference
                            pass
                        else:
                            raise RuntimeError("Conflicting structure type data")
                    else:
                        raise RuntimeError("Conflicting type data")
        return out


    ####################
    ## CTYPES SUPPORT ##
    ####################

    # mapping from encoding and bytes to ctypes type name
    CTYPES_BASE_TYPES = {
        ('Boolean'      , 1): 'ctypes.c_bool',
        ('Unsigned char', 1): 'ctypes.c_char',
        ('Signed char'  , 1): 'ctypes.c_int8',
        ('Unsigned'     , 2): 'ctypes.c_uint16',
        ('Signed'       , 2): 'ctypes.c_int16',
        ('Unsigned'     , 4): 'ctypes.c_uint32',
        ('Signed'       , 4): 'ctypes.c_int32',
        ('Unsigned'     , 8): 'ctypes.c_uint64',
        ('Signed'       , 8): 'ctypes.c_int64',
    }

    def ctypesFields(self, node, indent=0, tabstop=4):
        """Return contents of _fields_ property for a ctypes structure"""
        assert isinstance(node, AstNode.Structure) or isinstance(node, AstNode.Union)
        if len(node.children) == 0:
            return '[]'
        fieldData = []
        for field in node.children:
            if isinstance(field.type, AstNode.Pointer) and isinstance(field.type.type, AstNode.Subroutine):
                field = AstNode.Member(name=field.name, type=field.type.type)
            fieldData.append(self.toCtypes(field, indent+1))
        return '[\n' + ',\n'.join(fieldData) + '\n' + ' ' * tabstop * indent + ']'

    def toCtypes(self, node, indent=0, tabstop=4):
        """Convert an AST node to ctypes"""
        if node is None:
            return 'None'
        tab = ' ' * tabstop * indent
        if isinstance(node, AstNode.Structure):
            return 'type("%s", (ctypes.Structure,), {"_fields_":%s})' % (node.name, self.ctypesFields(node, indent, tabstop))
        elif isinstance(node, AstNode.Union):
            return 'type("%s", (ctypes.Union,    ), {"_fields_":%s})' % (node.name, self.ctypesFields(node, indent, tabstop))
        elif isinstance(node, AstNode.Member):
            return tab + '("%s", %s)' % (node.name, self.toCtypes(node.type, indent, tabstop))
        elif isinstance(node, AstNode.Pointer):
            if node.type is None:
                return 'ctypes.c_void_p'
            elif isinstance(node.type, AstNode.Const):
                return self.toCtypes(AstNode.Pointer(type=node.type.type))
            elif isinstance(node.type, AstNode.Reference):
                return 'ctypes.POINTER(%s)' % node.type.name
            elif isinstance(node.type, AstNode.Base) and node.type.bytes == 1 and node.type.encoding == 'Signed char':
                return 'ctypes.c_char_p'
            else:
                return 'ctypes.POINTER(%s)' % self.toCtypes(node.type, indent + 1, tabstop)
        elif isinstance(node, AstNode.Subroutine):
            if node.type is None:
                ret = 'None'
            else:
                ret = self.toCtypes(node.type, indent, tabstop)
            return 'ctypes.CFUNCTYPE(%s)' % ', '.join(
                [ret] + [self.toCtypes(p.type, indent + 1, tabstop) for p in node.parameters])
        elif isinstance(node, AstNode.Base):
            return self.CTYPES_BASE_TYPES[(node.encoding, node.bytes)]
        elif isinstance(node, AstNode.Array):
            return self.toCtypes(node.type, indent, tabstop) + ''.join([' * %d' % d.ubound for d in node.dimensions])
        elif isinstance(node, AstNode.Enumeration):
            return self.CTYPES_BASE_TYPES[(node.encoding, node.bytes)]
        elif isinstance(node, AstNode.Const):
            return self.toCtypes(node.type, indent, tabstop)
        elif isinstance(node, AstNode.Typedef):
            if node.type is not None:
                return self.toCtypes(node.type, indent=indent, tabstop=tabstop)
            else:
                return 'type("%s", (ctypes.Structure,), {"_fields_":[]})' % node.name
        else:
            raise RuntimeError("Unrecognized node type: {}".format(node.__class__.__name__))

    def dumpStructs(self, out_file, lib_name):

        def convertParameter(p):
            param_type = self.followTypedefs(p.type)
            if isinstance(param_type, AstNode.Pointer) and isinstance(param_type.type, AstNode.Subroutine):
                # parameter is a pointer to a function
                fn_type = param_type.type
                ret_type = self.followTypedefs(fn_type.type)
                if isinstance(ret_type, AstNode.Pointer):
                    if isinstance(ret_type.type, AstNode.Base):
                        pass  # keep pointers to base types
                    elif isinstance(ret_type.type, AstNode.Const) and isinstance(ret_type.type.type, AstNode.Base):
                        pass  # keep const pointers to base types
                    else:
                        ret_type = AstNode.Pointer(None)  # convert pointers to complex types to void pointers
                # switch from subroutine pointer to subroutine
                p_type = AstNode.Subroutine(
                    name=fn_type.name,
                    parameters=fn_type.parameters,
                    type=ret_type
                )
                return ' ' * 8 + '%s,  # %s' % (self.toCtypes(p_type), p.name)
            else:
                # not a function pointer so convert directly
                return ' ' * 8 + '%s,  # %s' % (self.toCtypes(p.type), p.name)

        # lists to build
        fwd_decl    = []
        struct_decl = []
        fn_decl     = []
        enum_decl   = []

        # iterate over extracted types in alphabetical order to build out data lists
        for k,t in sorted(self.typeMap().items(), key=lambda x:x[0]):

            # if a pointer to a subroutine, follow the pointer
            if isinstance(t,AstNode.Pointer) and isinstance(t.type, AstNode.Subroutine):
                t = t.type

            # for a struct or union, add a forward declaration and a list of field types
            if isinstance(t,AstNode.Structure) or isinstance(t,AstNode.Union):
                fwd_decl.append('class %s(ctypes.Structure):\n    pass' % k)
                struct_decl.append('%s._fields_ = %s' % (k,self.ctypesFields(t)))

            elif isinstance(t, AstNode.Subroutine):
                kwargs = {
                    'fn_name'    : k,
                    'lib_name'   : lib_name,
                    'type_name'  : self.toCtypes(t.type),
                    'parameters' : '\n'.join([convertParameter(p) for p in t.parameters]),
                }
                template = WRAPPED_FN_TEMPLATE if t.takesCallback() else FN_TEMPLATE
                fn_decl.append(template.format(**kwargs).strip())
            elif isinstance(t, AstNode.Enumeration):
                enum_decl += ['# enum: {}'.format(t.name)]+['%s = %d' % (e.name,e.value) for e in t.children]
            elif isinstance(t, AstNode.Base):
                pass
            elif t is None:
                pass
            else:
                raise RuntimeError("Unrecognized type: {}".format(t))

        # generate export
        print "Creating export:", out_file
        with open(out_file,'wt') as F:
            F.write('import ctypes, sys\n\n')
            F.write('platform_ext = {"darwin":".dylib", "win32":".dll"}.get(sys.platform, ".so")\n')
            F.write('%s = ctypes.CDLL("%s" + platform_ext)\n\n' % (lib_name, os.path.basename(self.in_file).split('.')[0]))
            F.write('##### ENUMERATIONS #####\n\n')
            F.write('\n'.join(enum_decl))
            F.write('\n\n')
            F.write('##### FORWARD DECLARATIONS FOR RECURSIVE USAGE #####\n\n')
            F.write('\n'.join(fwd_decl))
            F.write('\n\n')
            F.write('##### FIELD DEFINITIONS #####\n\n')
            F.write('\n\n'.join(struct_decl))
            F.write('\n\n')
            F.write('##### FUNCTION DEFINITIONS #####\n\n')
            F.write('\n\n'.join(fn_decl))
            F.write('\n\n')

        # return the generated file name
        return out_file

FN_TEMPLATE = '''
if hasattr({lib_name}, "{fn_name}"):
    {fn_name} = {lib_name}.{fn_name}
    {fn_name}.restype = {type_name}
    {fn_name}.argtypes = tuple([
{parameters}
    ])
'''

WRAPPED_FN_TEMPLATE = '''
if hasattr({lib_name}, "{fn_name}"):
    {lib_name}.{fn_name}.restype = {type_name}
    {lib_name}.{fn_name}.argtypes = tuple([
{parameters}
    ])
    def {fn_name}(*argv):
        if not hasattr({fn_name}, "callbacks"):
            {fn_name}.callbacks = []  # callback references to avoid garbage collection
        args = []
        for arg,fn_arg in zip(argv,{lib_name}.{fn_name}.argtypes):
            if callable(arg): # wrap functions                
                {fn_name}.callbacks.append(fn_arg(arg))
                args.append({fn_name}.callbacks[-1])
            else:
                args.append(arg)
        return {lib_name}.{fn_name}(*args)
'''

################################################################################

if __name__ == '__main__':

    # parse input arguments
    parser = argparse.ArgumentParser(description="DWARF structure extraction tool")
    parser.add_argument('infile', help="shared object to parse")
    parser.add_argument('outfile', help="python file to generate")
    parser.add_argument('--libname', help="library name to use in generated code")
    parser.add_argument('--nocheck', help="skip import check", action="store_true")
    args = parser.parse_args()

    # library name
    if args.libname is not None:
        libname = args.libname
    else:
        libname = os.path.basename(args.outfile).split('.')[0]

    # generate code
    info = DwarfInfo(args.infile)
    gen_file = info.dumpStructs(args.outfile, libname)

    # test import
    if not args.nocheck:
        gen_dir = os.path.dirname(gen_file)
        if gen_dir != '':
            sys.path.append(gen_dir)
        t0 = time.time()
        __import__(os.path.basename(gen_file).replace('.py', ''))
        print "Imported in %.3f seconds" % (time.time() - t0)