package main

import (
	"encoding/json"
	"fmt"
	"os"
	"reflect"
	"time"
)

func main() {
	success_ := true
	message_ := ""
	executionResults_ := []string{}

	var start_ time.Time
	var result_ interface{}
	var executionTime_ interface{}

	var a1 int64 = 1

	var b1 int64 = 1

	var c1 string = "a"

	var d1 float64 = 1.3

	var e1 bool = true

	var f1 map[string]string = map[string]string{"key1": "val1", "key2": "val2"}

	var g1 []string = []string{"asdf", "fdsa"}

	var h1 [][]string = [][]string{{"Jack", "Alice"}}

	var expected1 int64 = 2

	start_ = time.Now()
	result_ = solution(a1, b1, c1, d1, e1, f1, g1, h1)
	executionTime_ = time.Now().Sub(start_)
	success_, message_ = assertSolution(result_, expected1, executionTime_, []interface{}{a1, b1, c1, d1, e1, f1, g1, h1}, success_)
	executionResults_ = append(executionResults_, message_)

	var a2 int64 = 2

	var b2 int64 = 2

	var c2 string = "a"

	var d2 float64 = 1.3

	var e2 bool = true

	var f2 map[string]string = map[string]string{"key1": "val1", "key2": "val2"}

	var g2 []string = []string{"asdf", "fdsa"}

	var h2 [][]string = [][]string{{"Jack", "Alice"}}

	var expected2 int64 = 4

	start_ = time.Now()
	result_ = solution(a2, b2, c2, d2, e2, f2, g2, h2)
	executionTime_ = time.Now().Sub(start_)
	success_, message_ = assertSolution(result_, expected2, executionTime_, []interface{}{a2, b2, c2, d2, e2, f2, g2, h2}, success_)
	executionResults_ = append(executionResults_, message_)

	if success_ {
		successMessage := buildMessage("ok", "__seed:4284522__")
		sendMessage(successMessage)
	} else {
		for _, m_ := range executionResults_ {
			sendMessage(m_)
		}
	}
}

func assertSolution(result, expected, executionTime, args interface{}, success bool) (bool, string) {
	status := reflect.DeepEqual(result, expected)
	if !status {
		message := buildAssertMessage("failure", result, expected, executionTime, args)
		return false, message
	}

	message := buildAssertMessage("success", result, expected, executionTime, args)
	return success, message
}

func buildMessage(status string, result interface{}) string {
	return fmt.Sprintf(`{"status": "%s", "result": %s}`, status, toJSON(result))
}

func buildAssertMessage(status string, result, expected, executionTime, arguments interface{}) string {
	return fmt.Sprintf(`{"status": "%s", "result": %s, "expected": %s, "arguments": %s, "execution_time": %s}`, status, toJSON(result), toJSON(expected), toJSON(arguments), toJSON(executionTime))
}

func toJSON(data interface{}) []byte {
	result, err := json.Marshal(data)
	if err != nil {
		fmt.Println("Marshaler error")
		os.Exit(0)
	}
	return result
}

func sendMessage(message string) {
	fmt.Println(message)
}
