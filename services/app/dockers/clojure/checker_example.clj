(ns checker_example
  (:require
    [clojure.test :refer :all]
    [clojure.data.json :as json]))

(try
  (load-file "solution_example.clj")
  (catch Exception ex
    (do
     (println (json/write-str {:status "error" :result (.getMessage ex)}))
     (System/exit 0)
     )))

(defn assert_result
  [expected result errorMessage]
  (try (assert (= expected result))
       (catch java.lang.AssertionError e
         (do
           (println (json/write-str {:status "failure" :result errorMessage}))
           (System/exit 0)
           ))))

(defn generate-tests
  [solution]
  (assert_result 3 (apply solution [1, 2]) "[1, 2]")
  (assert_result 8 (apply solution [5, 3]) "[5, 3]")
  (println (json/write-str {:status "ok" :result "__code-0__"})))

(defn -main []
  (generate-tests solution))
