import sys
sys.path.append('../../src/django')

from django.core.management import setup_environ
import giraffe.settings
setup_environ(giraffe.settings)

####

import re
from giraffe.blat.models import Feature
from giraffe.blat.models import Feature_Database

db = sys.argv[1]

if db != 'none':
    fdb = Feature_Database()
    fdb.name = db
    try:
        fdb.save()
    except:
        fdb = Feature_Database.objects.get(name=db)

for line in sys.stdin.readlines():
    m = re.match('^E:(\w+),(\d)\/(\d) (.+)$',line)
    if m != None:
        id = 4
        type = 'Enzyme'
        name = m.group(1)
        cut_after = int(m.group(2))
        sequence = m.group(4)

        f = Feature()
        f.type_id = id
        f.name = name
        f.sequence = sequence
        f.cut_after = cut_after
        try:
            f.save()
        except:
            f = Feature.objects.get(name=name,hash=f.hash)

        if db != 'none':
            fdb.features.add(f)

    else:
        m = re.match('^(\w+):(\S+) (.+)$',line)
        if m:
            id = 1
            type = 'Feature'
            name = m.group(2)
            sequence = m.group(3)
            n = m.group(1)
            if n == "G":
                type = "Gene"
                id = 5
            elif n == "P":
                type = "Promoter"
                id = 2
            elif n == "O":
                type = "Origin"
                id = 6
            elif n == "R":
                type = "Regulatory"
                id = 7
            elif n == "T":
                type = "Terminator"
                id = 8
            elif n == "E":
                type = "Enzyme"
                id = 4
            elif n == "f":
                type = "ExactFeature"
                id = 9
            elif n == "S":
                type = "Primer"
                id = 3

            f = Feature()
            f.type_id = id
            f.name = name
            f.sequence = sequence
            try:
                f.save()
            except:
                f = Feature.objects.get(name=name,hash=f.hash)
        
            if db != 'none':
                fdb.features.add(f)

