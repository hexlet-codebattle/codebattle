(require '[cheshire.core :as json])

(defn now []
  (System/currentTimeMillis))

(defn execution-time [start-time]
  (- (now) start-time))

(defn run-tests [solution args]
  (reduce (fn [acc arg]
    (let [start-time (now)
          new-acc (atom {})
          output
      (with-out-str
        (try
          (swap! new-acc (fn [_] {:type "result" :value (apply solution arg)}))
        (catch Exception ex
          (swap! new-acc (fn [_] {:type "error" :value (.getMessage ex)})))))]
      (conj acc (merge {:output output :time (execution-time start-time)} @new-acc)))) [] args))

(try
  (let [data (json/parse-string (slurp "check/asserts.json"))
        args (data "arguments")]
      (load-file "check/solution.clj")
      (let [solution-fn (resolve 'solution)]
        (println (json/generate-string (run-tests solution-fn args)))))
    (catch Exception ex
      (println (json/generate-string {:type "error" :time 0 :value (.getMessage ex)}))
      (System/exit 0)))
