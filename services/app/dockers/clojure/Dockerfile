FROM clojure:openjdk-13-tools-deps-1.10.1.502

RUN apt-get update && apt-get install -y build-essential curl unzip

WORKDIR /usr/src/app

ADD deps.edn .
RUN clojure -e "(prn :install)"

RUN curl -O "https://raw.githubusercontent.com/borkdude/clj-kondo/master/script/install-clj-kondo" \
        && bash install-clj-kondo

ADD checker_example.clj .
ADD solution_example.clj .
ADD test_clojure.clj .
ADD Makefile .
