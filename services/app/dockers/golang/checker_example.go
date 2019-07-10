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

  AssertSolution(solution(a1, b1), expected1, "[1, 2]");

  var a2 int64 = 3;
  var b2 int64 = 2;
  var expected2 int64 = 5;

  AssertSolution(solution(a2, b2), expected2, "[3, 2]");

  SendMessageAndExit("ok", "__code-0__");
}

func AssertSolution(result interface{}, expected interface{}, message string) {
  var status bool = reflect.DeepEqual(result, expected);
  if status == false {
    SendMessageAndExit("failure", message);
  }
}

func SendMessageAndExit(status string, result string) {
  fmt.Printf("{\"status\": \"%s\", \"result\": \"%s\"}", status, result);
  os.Exit(0)
}
