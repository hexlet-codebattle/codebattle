package main

import (
  "fmt";
  "os";
  "reflect";
)

func main() {
  var a1 int64 = 1;
  var b1 int64 = 2;
  var expected1 int64 = 3;

  AssertSolution(solution(a1, b1), expected1, [1, 2]);

  var a2 int64 = 3;
  var b2 int64 = 2;
  var expected2 int64 = 5;

  AssertSolution(solution(a2, b2), expected2, [3, 2]);

  SendMessageAndExit("ok", "__code-0__");
}

func AssertSolution(result interface{}, expected interface{}, message []interface{}) {
  var status bool = reflect.DeepEqual(result, expected);
  if status == false {
    SendFailureMessageAndExit("failure", message);
  }
}

func SendMessageAndExit(status string, result string) {
  fmt.Printf("{\"status\": \"%s\", \"result\": \"%s\"}", status, result);
  os.Exit(0)
}

func SendFailureMessageAndExit(status string, result []interface{}) {
  message, err := json.Marshal(result)
  if err != nil {
    fmt.Println("Marshaler error")
    os.Exit(0)
  }

  fmt.Printf("{\"status\": \"%s\", \"result\": \"%s\"}", status, message);
  os.Exit(0)
}
