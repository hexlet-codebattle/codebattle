(try
  (load-file "check/solution.clj")
  (catch Exception ex
    (do
     (println (json/write-str {:status "error" :result (.getMessage ex)}))
     (System/exit 0)
     )))

(defmacro with-out-str-data-map
  [& body]
  `(let [s# (new java.io.StringWriter)]
     (binding [*out* s#]
       (let [r# ~@body]
         {:result r#
          :output    (str s#)}))))

(defn get-solution-result
  [solution args]
  (let [start (System/currentTimeMillis)
    run-info (with-out-str-data-map (apply solution args))
    execution-time (- (System/currentTimeMillis) start)
  ]
  {:result (get run-info :result) :output (get run-info :output) :execution_time execution-time}))

(defn assert-result
  [expected solution args]
  (let [info (get-solution-result solution args)
    result (get info :result)
    execution-time (get info :execution_time)
    output (get info :output)]

    (try (assert (= expected result))
      (println (json/write-str {:status "success" :result result :expected expected :output output :arguments args :execution_time execution-time}))
      true
    (catch java.lang.AssertionError e
      (do
        (println (json/write-str {:status "failure" :result result :expected expected :output output :arguments args :execution_time execution-time}))
        false
        )))))

(defn get-test-status [status-test status-assert]
  (if status-test
    (if status-assert
      status-test
      status-assert
      )
    status-test))

(defn generate-tests
  [solution]
  (println "\n")
  (try (let [success
              (reduce get-test-status
                [

                  (assert-result 2 solution [1, 1])

                  (assert-result 4 solution [2, 2])

                  (assert-result 3 solution [1, 2])

                  (assert-result 5 solution [3, 2])

                  (assert-result 6 solution [5, 1])

                  (assert-result 2 solution [1, 1])

                  (assert-result 4 solution [2, 2])

                  (assert-result 3 solution [1, 2])

                  (assert-result 5 solution [3, 2])

                  (assert-result 6 solution [5, 1])

                ])]
        (if success
          (println (json/write-str {:status "ok" :result "__seed:124949491112958542__"}))))
    (catch Exception ex
      (do
        (println (json/write-str {:status "error" :result (.getMessage ex)}))
        (System/exit 0)
      ))))
