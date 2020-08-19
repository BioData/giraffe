FROM 571624102388.dkr.ecr.us-east-1.amazonaws.com/ubuntu:b95

RUN apt update && apt install apache2 -y
RUN apt install libapache2-mod-wsgi -y
RUN mkdir /var/www/giraffe
WORKDIR /var/www/giraffe
COPY . .
RUN useradd biodata
RUN chown -R biodata:biodata /var/www/giraffe
RUN chmod -R 755 /var/www/giraffe
RUN mkdir /home/biodata
RUN cp apache/giraffe.labguru.com /etc/apache2/sites-available/giraffe.labguru.com.conf
RUN apt-get install -y --no-install-recommends gcc
RUN apt install python-pip -y
RUN apt-get install python-dev -y
RUN apt-get install python-mysqldb -y
RUN pip install Django==1.3.7
RUN apt-get install default-libmysqlclient-dev -y
RUN pip install mysqlclient==1.3.12
RUN pip install mysqlclient
RUN apt-get install -y libmcrypt-dev default-mysql-client
RUN pip install numpy==1.5.1
RUN pip install biopython-1.56.tar.gz
WORKDIR /var/www/giraffe/src/django/giraffe/blat/frags
RUN gcc -O6 -o bin/frags frags.c
RUN a2ensite giraffe.labguru.com.conf && a2dissite 000-default
RUN update-rc.d apache2 enable
WORKDIR /var/www/giraffe/files
RUN ln -s /var/www/giraffe/src/django/giraffe/analyze/static analyze
