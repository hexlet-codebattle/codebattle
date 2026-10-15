(defn solution [a b _ _ _ _ _ _]
  (try
    (do
      (println "output-test")
      (/ a b))
    (catch Exception ex
      (println (str "dont't do it " (.getMessage ex)))
      (throw (Exception. "AAAAAAAAA")))))
