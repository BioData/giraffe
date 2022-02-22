# About
Giraffe: tool for detecting popular features in DNA sequence, creating
maps of those features, and performing sequence analysis.

This software is written and copyrighted by Addgene, and released
under the MIT License. See LICENSE file.

The software is mostly divided into two parts: a Django based service that
detects features within a sequence, and a set of JavaScript widgets that
visualize the sequence, features, digests, etc.

You can use the two parts separately. I.e. you can just use the JavaScript
widget for visualizing and analyzing sequence and features. See HTML files in
the demo directory.

# Test run
* No cloneing of repository is needed.
* MySQL server running is required.

Run a test on standalone server.
Don't forget to change DB_HOST and DB_PASS accordingly. 
```
docker build -t foo https://github.com/BioData/giraffe.git && docker run -e DB_PASS=Password -e DB_HOST=127.0.0.1 -p 8000:8000 --rm -it foo
```

If you are running a MySQL container don't forget to add "--network=host" when running:
```
docker build -t foo https://github.com/BioData/giraffe.git && docker run -e DB_PASS=Password -e DB_HOST=127.0.0.1 -p 8000:8000 --network=host --rm -it foo
```

# Setup DB sercer:
	Login to your MySQL server and create the database 'giraffe':
	```
	CREATE DATABASE giraffe CHARACTER SET 'utf8'
	```



# API:

	You can POST a sequence to "/blat/", with the following CGI variables:

		db=default&sequence=your_dna_sequence_here

	Then you will be redirected to a URL that looks like

		/blat/8de364690dbeb88d2ab63bd66861725539aa3204/default

	The "8de3...3204" string is the hash identifier for your sequence. You can
	use this hash identifier and this URL to retrieve features in the future
	(JSON format).

	Also, you can use the hash identifier with the JavaScript widgets. See demo
	directory. You can download the HTML files from the demo directory to your
	local computer, and load them in your browser. These files show how you can
	incorporate Giraffe sequence map and analyzer widgets in your web app.

	
How to build your own features database:

	To be added later.


