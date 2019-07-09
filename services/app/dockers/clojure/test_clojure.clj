(ns test_clojure
  (:require
    [clojure.test :refer :all]
    [clojure.data.json :as json]))

(load-file "check/checker.clj")

(defn -main []
  (generate-tests solution))
