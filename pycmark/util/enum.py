template = '''Enumeration class for values:
{values}

{cls}.{label}    # access a value
{cls}[0]         # reverse lookup from value to name

# subclass visitor to provide methods
class {cls}VisitorImpl({cls}.Visitor):
{methods}

# use visitor
visitor = {cls}VisitorImpl()
visitor.visit({cls}.{label}, arg)
'''

method_template = '''
    def visit{label}(self, *args, **kwargs):
        pass  # implementation goes here'''

def enum(labels, name='Enum'):
    """
    Generate an enumeration class for a given set of labels
    :param labels: Collection of strings representing enumeration values
    :param name: Optional enumeration class name
    :return: Enumeration class

    SwitchEnum = enum(['On', 'Off'], name='SwitchEnum')
    status = SwitchEnum.On      # 0
    label = SwitchEnum[status]  # 'On'

    class SwitchVisitor(SwitchEnum.Visitor):
        def visitOn(self, *args, **kwargs):
            print("Switch is on!")
        def visitOff(self, *args, **kwargs):
            print("Switch is off!")

    SwitchVisitor().visit(SwitchEnum.Off)
    """

    # check inputs
    labels = list(labels)
    for lbl in labels:
        if not isinstance(lbl, str):
            raise ValueError("Enumeration label not a string: {}".format(lbl))

    # metaclass to enable class-level enumeration reverse lookup
    class MetaA(type):
        def __getitem__(cls, val):
            if val in cls._lookup:
                return cls._lookup[val]
            else:
                raise ValueError("Invalid enumeration value: {}".format(val))

    # define enumeration class
    class Cls(object):
        __metaclass__ = MetaA

        # lookup table from values to labels
        _lookup = dict(enumerate(labels))

        # visitor class
        class Visitor(object):

            # check for implementations of visitor methods on init
            def __init__(self):
                self.checkMethods()

            @classmethod
            def checkMethods(cls):
                """Raise an exception if there are missing visitor methods"""
                for lbl in Cls._lookup.values():
                    if not hasattr(cls, 'visit' + lbl):
                        raise NotImplementedError("Undefined visitor: visit{}".format(lbl))

            def visit(self, x, *args, **kwargs):
                """Dispatch to the appropriate visitor"""
                if x not in Cls._lookup:
                    raise ValueError("Invalid enumeration value: {}".format(x))
                getattr(self, 'visit' + Cls._lookup[x])(*args, **kwargs)

    # attach docstring
    Cls.__doc__ = template.format(
        values='\n'.join(['  - {}'.format(lbl) for lbl in labels]),
        label=labels[0],
        cls=name,
        methods='\n'.join([method_template.format(label=lbl) for lbl in labels])
    )

    # attach labels
    for i, lbl in enumerate(labels):
        setattr(Cls, lbl, i)

    # return the generated class
    return Cls


