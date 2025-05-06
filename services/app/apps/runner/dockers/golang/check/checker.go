package main

import (
	"encoding/json"
	"fmt"
	"os"
	"reflect"
	"sync"
	"time"
)

// Pre-allocate buffer for JSON marshaling
var jsonBufferPool = sync.Pool{
	New: func() interface{} {
		buf := make([]byte, 0, 1024) // Pre-allocate 1KB buffer
		return &buf
	},
}

func main() {
	// Pre-allocate memory for results
	success_ := true
	var message_ string
	executionResults_ := make([]string, 0, 10) // Pre-allocate capacity

	// Define test cases in a more compact way
	testCases := []struct {
		a, b       int64
		c         string
		d         float64
		e         bool
		f         map[string]string
		g         []string
		h         [][]string
		expected  int64
	}{
		{
			a: 1, b: 1, c: "a", d: 1.3, e: true,
			f: map[string]string{"key1": "val1", "key2": "val2"},
			g: []string{"asdf", "fdsa"},
			h: [][]string{{"Jack", "Alice"}},
			expected: 2,
		},
		{
			a: 2, b: 2, c: "a", d: 1.3, e: true,
			f: map[string]string{"key1": "val1", "key2": "val2"},
			g: []string{"asdf", "fdsa"},
			h: [][]string{{"Jack", "Alice"}},
			expected: 4,
		},
	}

	// Run test cases
	for _, tc := range testCases {
		start_ := time.Now()
		result_ := solution(tc.a, tc.b, tc.c, tc.d, tc.e, tc.f, tc.g, tc.h)
		executionTime_ := time.Since(start_)

		args := []interface{}{tc.a, tc.b, tc.c, tc.d, tc.e, tc.f, tc.g, tc.h}
		var newSuccess bool
		newSuccess, message_ = assertSolution(result_, tc.expected, executionTime_, args, success_)
		success_ = newSuccess
		executionResults_ = append(executionResults_, message_)

		// Break early if a test fails
		if !success_ {
			break
		}
	}

	// Output results
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
	return fmt.Sprintf(`{"status": "%s", "result": %s}`, status, string(toJSON(result)))
}

func buildAssertMessage(status string, result, expected, executionTime, arguments interface{}) string {
	return fmt.Sprintf(`{"status": "%s", "result": %s, "expected": %s, "arguments": %s, "execution_time": %s}`,
		status,
		string(toJSON(result)),
		string(toJSON(expected)),
		string(toJSON(arguments)),
		string(toJSON(executionTime)))
}

func toJSON(data interface{}) []byte {
	// Get buffer from pool
	bufPtr := jsonBufferPool.Get().(*[]byte)
	buf := (*bufPtr)[:0] // Reset buffer but keep capacity

	// Use the buffer for marshaling
	result, err := json.Marshal(data)
	if err != nil {
		fmt.Println("Marshaler error")
		os.Exit(0)
	}

	// Put buffer back in pool
	*bufPtr = buf
	jsonBufferPool.Put(bufPtr)

	return result
}

func sendMessage(message string) {
	fmt.Println(message)
}
