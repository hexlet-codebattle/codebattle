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
			sendMessage("error", fmt.Sprintf("%s", err), nil)
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
		sendMessage("ok", "__code-0__", nil)
	}
}

type resultMessage struct {
	Status    string      `json:"status"`
	Result    interface{} `json:"result"`
	Arguments interface{} `json:"arguments,omitempty"`
}

func assertSolution(result, expected, message interface{}, success bool) bool {
	status := reflect.DeepEqual(result, expected)
	if !status {
		sendMessage("failure", result, message)
		return false
	}

	return success
}

func sendMessage(status string, result, arguments interface{}) {
	message := resultMessage{
		Status:    status,
		Result:    result,
		Arguments: arguments,
	}

	jsonMessage, err := json.Marshal(message)
	if err != nil {
		fmt.Println("Marshaler error")
		os.Exit(0)
	}

	fmt.Print(string(jsonMessage))
}
