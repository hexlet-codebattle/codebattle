(require '[cheshire.core :as json])

(defn execution-time [start-time]
  (- (System/currentTimeMillis) start-time))

(defn run-tests [solution args]
  (reduce (fn [acc arg]
    (let [start-time (System/currentTimeMillis)
          new-acc (atom {})
          output
      (with-out-str
        (try
          (swap! new-acc #(merge % {:type "result" :value (apply solution arg) :time (execution-time start-time)}))
        (catch Exception ex
          (swap! new-acc #(merge % {:type "error" :value (.getMessage ex) :time (execution-time start-time)})))))]
      (conj acc (merge {:output output} @new-acc)))) [] args))

(try
  (let [data (json/parse-string (slurp "check/asserts.json"))
        args (data "arguments")]
      (load-file "check/solution.clj")
      (let [solution-fn (resolve 'solution)]
        (println (json/generate-string (run-tests solution-fn args)))))
    (catch Exception ex
        (println (json/generate-string {:type "error" :time 0 :value (.getMessage ex)}))
        (System/exit 0)))
