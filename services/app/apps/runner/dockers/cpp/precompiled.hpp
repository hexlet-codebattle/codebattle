#ifndef PRECOMPILED_HPP
#define PRECOMPILED_HPP

// Include the standard C++ library
#include <bits/stdc++.h>

// Include JSON library - using direct paths for Docker environment
#include "json.hpp"
#include "fifo_map.hpp"

// JSON type definitions
template<class K, class V, class dummy_compare, class A>
using fifo_map = nlohmann::fifo_map<K, V, nlohmann::fifo_map_compare<K>, A>;
using json = nlohmann::basic_json<fifo_map>;

// Helper functions for the checker
template <typename T1>
json BuildResultMessage(std::string status, T1 result, std::string output, std::string executionTime) {
  json j;
  j["type"] = status;
  j["value"] = result;
  j["output"] = output;
  j["time"] = executionTime;
  return j;
}

void SendMessage(json j) {
  std::cout << j << "\n";
}

template <typename T>
json BuildErrorMessage(std::string status, T result) {
  json j;
  j["type"] = status;
  j["value"] = result;
  return j;
}

// Template function to build assertion messages for test results
template <typename T1, typename T2>
json BuildAssertMessage(std::string status, T1 result, T2 expected, std::string output, std::string args, double executionTime) {
  json j;
  j["status"] = status;
  j["result"] = result;
  j["expected"] = expected;
  j["output"] = output;
  j["arguments"] = args;
  j["execution_time"] = executionTime;
  return j;
}

// Template function to assert solution results and build appropriate messages
template <typename T1, typename T2>
bool AssertSolution(T1 result, T2 expected, std::string output, std::string args, double executionTime, std::vector<json> &finalResults, bool success) {
  bool status = result == expected;
  if (status == false) {
    json message = BuildAssertMessage("failure", result, expected, output, args, executionTime);
    finalResults.push_back(message);
    return false;
  }

  json message = BuildAssertMessage("success", result, expected, output, args, executionTime);
  finalResults.push_back(message);
  return success;
}

// Template function to build simple status messages
template <typename T>
json BuildMessage(std::string status, T result) {
  json j;
  j["status"] = status;
  j["result"] = result;
  return j;
}

#endif // PRECOMPILED_HPP
