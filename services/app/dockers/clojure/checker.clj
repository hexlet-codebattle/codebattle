(ns checker
  (:require
    [clojure.test :refer :all]
    [clojure.data.json :as json]))

(try
  (load-file "check/solution.clj")
  (catch Exception ex
    (do
     (println (json/write-str {:status "error" :result (.getMessage ex)}))
     (System/exit 0)
     )))

(def data (line-seq (java.io.BufferedReader. *in*)))

(def prepared-data
  (json/read-str (str "[" (apply str data) "]") :key-fn keyword))

(defn generate-tests
  [data solution]
  (doseq [x data]
    (if (:check x)
      (println (json/write-str {:status "ok" :result (:check x)}))
      (try (assert (= (:expected x) (apply solution (:arguments x))))
           (catch java.lang.AssertionError e
             (do
              (println (json/write-str {:status "failure" :result (:arguments x)}))
              (System/exit 0)
              ))))))
(defn -main []
  (generate-tests prepared-data solution))
