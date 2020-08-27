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
WORKDIR /var/www/giraffe/src/django/giraffe/blat/frags
RUN gcc -O6 -o bin/frags frags.c
RUN a2ensite giraffe.labguru.com.conf && a2dissite 000-default
RUN a2enmod headers 
RUN update-rc.d apache2 enable
WORKDIR /var/www/giraffe/files
RUN ln -s /var/www/giraffe/src/django/giraffe/analyze/static analyze
