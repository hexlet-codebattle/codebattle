package main

import (
	"encoding/json"
	"fmt"
	"os"
	"reflect"
)

func main() {
	defer func() {
		if err := recover(); err != nil {
			sendMessage("error", fmt.Sprintf("%s", err))
		}
		os.Exit(0)
	}()

	success := true

	var a1 int64 = 1
	var b1 int64 = 2
	var expected1 int64 = 3

	success = assertSolution(solution(a1, b1), expected1, []interface{}{a1, b1}, success)

	var a2 int64 = 3
	var b2 int64 = 2
	var expected2 int64 = 5

	success = assertSolution(solution(a2, b2), expected2, []interface{}{a2, b2}, success)

	if success {
		sendMessage("ok", "__code-0__")
	}
}

func assertSolution(result, expected, message interface{}, success bool) bool {
	status := reflect.DeepEqual(result, expected)
	if !status {
		sendFailureMessage("failure", result, message)
		return false
	}

	return success
}

func sendMessage(status string, result interface{}) {
	fmt.Printf(`{"status": "%s", "result": %s}`, status, toJSON(result))
  fmt.Println()
}

func sendFailureMessage(status string, result, arguments interface{}) {
	fmt.Printf(`{"status": "%s", "result": %s, "arguments": %s}`, status, toJSON(result), toJSON(arguments))
  fmt.Println()
}

func toJSON(data interface{}) []byte {
	result, err := json.Marshal(data)
	if err != nil {
		fmt.Println("Marshaler error")
		os.Exit(0)
	}
	return result
}
