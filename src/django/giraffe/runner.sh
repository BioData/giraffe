#!/bin/bash
CHECK_DB=`mysqlshow --host=${DB_HOST} --user=${DB_USER} --password=${DB_PASS} giraffe 2> /dev/null | grep -v Wildcard | grep -o giraffe`

if [ ! "$CHECK_DB" == "giraffe" ]; then

 mysql --host=${DB_HOST} --user=${DB_USER} --password=${DB_PASS} 2> /dev/null << EOF
CREATE DATABASE giraffe CHARACTER SET 'utf8'
EOF

fi

python manage.py syncdb --noinput
python manage.py runserver 0.0.0.0:${CONTAINER_PORT}