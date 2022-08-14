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

(defn get_solution_result
  [solution args]
  (let [start (System/currentTimeMillis)
    run_info (with-out-str-data-map (apply solution args))
    execution_time (- (System/currentTimeMillis) start)
  ]
  {:result (get run_info :result) :output (get run_info :output) :execution_time execution_time}))

(defn assert_result
  [expected solution args]
  (let [info (get_solution_result solution args)
    result (get info :result)
    execution_time (get info :execution_time)
    output (get info :output)]

    (try (assert (= expected result))
      (println (json/write-str {:status "success" :result result :expected expected :output output :arguments args :execution_time execution_time}))
      true
    (catch java.lang.AssertionError e
      (do
        (println (json/write-str {:status "failure" :result result :expected expected :output output :arguments args :execution_time execution_time}))
        false
        )))))

(defn get_test_status [status_test status_assert]
  (if status_test
    (if status_assert
      status_test
      status_assert
      )
    status_test))

(defn generate-tests
  [solution]
  (println "\n")
  (try (let [success
              (reduce get_test_status
                [
                  (assert_result 3 solution [1, 2])
                  (assert_result 8 solution [5, 3])
                ])]
        (if success
          (println (json/write-str {:status "ok" :result "lolKek"}))))
    (catch Exception ex
      (do
        (println (json/write-str {:status "error" :result (.getMessage ex)}))
        (System/exit 0)
      ))))
