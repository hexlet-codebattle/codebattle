(ns runner
  (:require
    [clojure.test :refer :all]
    [cheshire.core :as json]))

(load-file "check/checker.clj")

(generate-tests solution)
