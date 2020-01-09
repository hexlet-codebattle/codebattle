#include <iostream>
#include <vector>
#include <map>

#include "json.hpp"
#include "fifo_map.hpp"

#include "solution_example.cpp"

using namespace std;

template<class K, class V, class dummy_compare, class A>
using my_workaround_fifo_map = nlohmann::fifo_map<K, V, nlohmann::fifo_map_compare<K>, A>;
using json = nlohmann::basic_json<my_workaround_fifo_map>;

template <typename T>
void SendFailureMessage(string status, T result, string message) {
  json j;
  j["status"] = status;
  j["result"] = result;
  j["arguments"] = message;

  cout << j;
}

template <typename T>
bool AssertSolution(T result, T expected, string message, bool success){
  bool status = result == expected;
  if (status == false) {
    SendFailureMessage("failure", result, message);
    return false;
  }
  return success;
}

template <typename T>
void SendMessage(string status, T result) {
  json j;

  j["status"] = status;
  j["result"] = result;

  cout << j;
}

int main() {
  bool success = true;

  int a1 = 1;
  int b1 = 2;
  int expected1 = 3;

  success = AssertSolution(solution(a1, b1), expected1, "[1, 2]", success);

  int a2 = 3;
  int b2 = 2;
  int expected2 = 5;

  success = AssertSolution(solution(a2, b2), expected2, "[3, 2]", success);

  if (success) {
    SendMessage("ok", "__code-0__");
  }
}

