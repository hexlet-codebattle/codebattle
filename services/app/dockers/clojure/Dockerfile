FROM clojure:openjdk-11-tools-deps-1.11.1.1149

RUN rm -rf /var/lib/apt/lists/* && apt-get update && apt-get install -y build-essential

WORKDIR /usr/src/app

ADD deps.edn .
RUN clojure -e "(prn :install)"

ADD checker_example.clj .
ADD solution_example.clj .
ADD test_clojure.clj .
ADD Makefile .
