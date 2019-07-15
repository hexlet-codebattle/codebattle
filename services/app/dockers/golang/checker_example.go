package main

import (
  "fmt";
  "os";
  "reflect";
)

func main() {
  var success bool = true;

  var a1 int64 = 1;
  var b1 int64 = 2;
  var expected1 int64 = 3;

  success = AssertSolution(solution(a1, b1), expected1, [1, 2], success);

  var a2 int64 = 3;
  var b2 int64 = 2;
  var expected2 int64 = 5;

  success = AssertSolution(solution(a2, b2), expected2, [3, 2], success);

  if success {
    SendMessageAndExit("ok", "__code-0__");
  }
}

func AssertSolution(result interface{}, expected interface{}, message []interface{}, success bool) bool {
  var status bool = reflect.DeepEqual(result, expected);
  if status == false {
    SendFailureMessage("failure", result, message);
    return false;
  }
  return success;
}

func SendMessageAndExit(status string, result string) {
  fmt.Printf("{\"status\": \"%s\", \"result\": \"%s\"}", status, result);
  os.Exit(0)
}

func SendFailureMessage(status string, result interface{}, message []interface{}) {
  resultMessage, err1 := json.Marshal(result)
  message, err2 := json.Marshal(result)
  if err1 != nil || err2 != nil {
    fmt.Println("Marshaler error")
    os.Exit(0)
  }

  fmt.Printf("{\"status\": \"%s\", \"result\": \"%s\", \"arguments\": \"%s\"}", status, result, message);
}
