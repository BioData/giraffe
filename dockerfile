FROM debian:buster-slim

WORKDIR /usr/src/app
RUN apt-get update
RUN apt-get install python2.7 python-pip -y
RUN apt dist-upgrade -y --fix-missing
RUN apt-get install -y --no-install-recommends gcc
RUN apt-get install python-dev -y --fix-missing
RUN apt-get install python-mysqldb -y --fix-missing
RUN python -m pip install --upgrade pip
RUN pip install Django==1.3.7
RUN apt-get install default-libmysqlclient-dev -y --fix-missing
RUN pip install mysqlclient==1.3.12
RUN pip install mysqlclient
RUN apt-get install -y libmcrypt-dev default-mysql-client  --fix-missing
COPY . .
RUN pip install numpy==1.5.1
RUN pip install biopython-1.56.tar.gz
RUN pip install django-cors-headers==1.0.0

WORKDIR /usr/src/app/src/django/giraffe/blat/frags
RUN ["gcc", "-o","bin/frags", "frags.c"]
WORKDIR /usr/src/app/src/django/giraffe

CMD [ "python", "./manage.py", "runserver" ,"0.0.0.0:8000"]
