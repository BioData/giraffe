import sys
sys.path.append('../../..')

from django.core.management import setup_environ
import giraffe.settings
setup_environ(giraffe.settings)

################################################################

# the following values must match those in frags.c
KTUP = 12
MASK = 16777215 # should be (4^KTUP)-1
MINFRAG = 6


def sequence_sum(s):
    """
    Calculates a checksum for the sequence.
    """
    # we only work with sequence of KTUP length
    s = s.ljust(KTUP,'a').lower()
    sum = 0
    for char in s:
        sum = sum << 2
        if char == 'a':
            sum = sum+0
        elif char == 'g':
            sum = sum+1
        elif char == 'c':
            sum = sum+2
        elif char == 't':
            sum = sum+3
        elif char == 'n':
            sum = sum+0
        else:
            raise Exception('Bad nucleotide '+char)
    return sum


def sequence_mask(s):
    """
    Returns sequence mask
    """
    m = ''.ljust(len(s),'t')
    return sequence_sum(m)


def reverse_complement(s):
    s = s[::-1].lower() # get reverse of s
    c = []
    for char in s:
        if char == 'a':
            c.append('t')
        elif char == 't':
            c.append('a')
        elif char == 'g':
            c.append('c')
        elif char == 'c':
            c.append('g')
    return ''.join(c)


from giraffe.blat.models import Feature_Type
from giraffe.blat.models import Feature_Database
from giraffe.blat.models import Feature
from giraffe.blat.models import Feature_DB_Index

db = sys.argv[1]
fdb = Feature_Database.objects.get(name=db)
enzyme_type = Feature_Type.objects.get(type="Enzyme")
Feature_DB_Index.objects.filter(db=fdb).delete()

feature_index = 0
features = []

# save an index of all the features
for f in fdb.features.all():
    if len(f.sequence) < MINFRAG:
        # print "Ignore small sequence "+f.name
        continue
    s = f.sequence.lower()

    fn = Feature_DB_Index()
    fn.db = fdb
    fn.feature_index = feature_index
    fn.feature = f
    fn.antisense = False
    fn.save()
    features.append(fn)
    feature_index = feature_index+1

    if f.type_id != enzyme_type.id:
        r = reverse_complement(s)
        if r != s:
            fn = Feature_DB_Index()
            fn.db = fdb
            fn.feature_index = feature_index
            fn.feature = f
            fn.antisense = True
            fn.save()
            features.append(fn)
            feature_index = feature_index+1
  

def split_len(seq, length):
    return [seq[i:i+length] for i in range(0, len(seq), length)]

output = []
for f in features:
    if f.antisense:
        fragments = split_len(reverse_complement(f.feature.sequence), KTUP)
    else:
        fragments = split_len(f.feature.sequence, KTUP)
    fragment_index = 0
    for idx,fn in enumerate(fragments):
        shift = 0
        if len(fn) < MINFRAG:
            left = len(fn)
            shift = KTUP-left
            fn = fragments[idx-1][left:]+fn
        n = sequence_sum(fn)
        m = sequence_mask(fn)
        if len(fn) == KTUP:
            m = 0
        output.append('%s,%s,%s,%s,%s,' % (f.feature_index,idx,m,n,shift))

print len(output)
print '\n'.join(output)

