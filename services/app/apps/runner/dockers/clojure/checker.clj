(require '[cheshire.core :as json])

(defn execution-time [start-time]
  (- (System/currentTimeMillis) start-time))

(try
  (let [data (json/parse-string (slurp "check/asserts.json"))
        args (data "arguments")]
  (do
    (load-file "check/solution.clj")
    (let [solution-fn (resolve 'solution)]
      (println (json/generate-string (reduce (fn [acc arg]
        (let [start-time (System/currentTimeMillis)
              new-acc (atom {})
              output (clojure.string/trim (with-out-str (try
            (swap! new-acc #(merge % {:type "result" :value (apply solution-fn arg) :time (execution-time start-time)}))
        (catch Exception ex
            (swap! new-acc #(merge % {:type "error" :value (.getMessage ex) :time (execution-time start-time)}))))))]
        (conj acc (merge {:output output} @new-acc)))) [] args))))))
  (catch Exception ex
    (do
      (println (json/generate-string {:type "error" :time 0 :value (.getMessage ex)})
      (System/exit 0)))))
