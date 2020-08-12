FROM python:2-slim

WORKDIR /usr/src/app
RUN apt-get update
RUN apt-get install -y --no-install-recommends gcc
RUN apt-get install python-dev -y
RUN apt-get install python-mysqldb -y
RUN pip install Django==1.3.7
RUN apt-get install default-libmysqlclient-dev -y
RUN pip install mysqlclient==1.3.12
RUN pip install mysqlclient
RUN apt-get install -y libmcrypt-dev default-mysql-client
COPY . .
RUN pip install numpy==1.5.1
WORKDIR /usr/src/app/giraffe
RUN pip install biopython-1.56.tar.gz
WORKDIR /usr/src/app/giraffe/src/django/giraffe/blat/frags
RUN gcc -O6 -o bin/frags frags.c
WORKDIR /usr/src/app/giraffe/src/django/giraffe
# CMD ["python", "manage.py" ,"syncdb --noinput"]
# CMD [ "python", "./manage.py", "runserver" ,"0.0.0.0:8000"]
