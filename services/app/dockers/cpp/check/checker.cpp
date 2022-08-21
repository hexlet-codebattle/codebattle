#include <iostream>
#include <string>
#include <sstream>
#include <vector>
#include <chrono>
#include <map>

#include "../json.hpp"
#include "../fifo_map.hpp"

#include "solution.cpp"

using namespace std;

template<class K, class V, class dummy_compare, class A>
using fifo_map = nlohmann::fifo_map<K, V, nlohmann::fifo_map_compare<K>, A>;
using json = nlohmann::basic_json<fifo_map>;

template <typename T1, typename T2>
json BuildAssertMessage(string status, T1 result, T2 expected, string output, string args, double executionTime) {
  json j;
  j["status"] = status;
  j["result"] = result;
  j["expected"] = expected;
  j["output"] = output;
  j["arguments"] = args;
  j["execution_time"] = executionTime;

  return j;
}

template <typename T1, typename T2>
bool AssertSolution(T1 result, T2 expected, string output, string args, double executionTime, vector<json> &finalResults, bool success) {
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

template <typename T>
json BuildMessage(string status, T result) {
  json j;
  j["status"] = status;
  j["result"] = result;

  return j;
}

void SendMessage(json j) {
  cout << j << "\n";
}

int main() {
  std::stringstream buffer_;
  std::streambuf * oldBuf_ = std::cout.rdbuf(buffer_.rdbuf());
  bool success_ = true;
  string output_ = "";
  vector<json> finalResults_ = {};

  try {


        int a1 = 1;

        int b1 = 1;

      int expected1 = 2;

      auto start1_ = std::chrono::system_clock::now();
      auto result1_ = solution(a1, b1);
      auto executionTime1_ = (std::chrono::system_clock::now() - start1_).count();
      output_ = buffer_.str();
      buffer_.str("");
      success_ = AssertSolution(result1_, expected1, output_, "1, 1", executionTime1_, finalResults_, success_);


        int a2 = 2;

        int b2 = 2;

      int expected2 = 4;

      auto start2_ = std::chrono::system_clock::now();
      auto result2_ = solution(a2, b2);
      auto executionTime2_ = (std::chrono::system_clock::now() - start2_).count();
      output_ = buffer_.str();
      buffer_.str("");
      success_ = AssertSolution(result2_, expected2, output_, "2, 2", executionTime2_, finalResults_, success_);


        int a3 = 1;

        int b3 = 2;

      int expected3 = 3;

      auto start3_ = std::chrono::system_clock::now();
      auto result3_ = solution(a3, b3);
      auto executionTime3_ = (std::chrono::system_clock::now() - start3_).count();
      output_ = buffer_.str();
      buffer_.str("");
      success_ = AssertSolution(result3_, expected3, output_, "1, 2", executionTime3_, finalResults_, success_);


        int a4 = 3;

        int b4 = 2;

      int expected4 = 5;

      auto start4_ = std::chrono::system_clock::now();
      auto result4_ = solution(a4, b4);
      auto executionTime4_ = (std::chrono::system_clock::now() - start4_).count();
      output_ = buffer_.str();
      buffer_.str("");
      success_ = AssertSolution(result4_, expected4, output_, "3, 2", executionTime4_, finalResults_, success_);


        int a5 = 5;

        int b5 = 1;

      int expected5 = 6;

      auto start5_ = std::chrono::system_clock::now();
      auto result5_ = solution(a5, b5);
      auto executionTime5_ = (std::chrono::system_clock::now() - start5_).count();
      output_ = buffer_.str();
      buffer_.str("");
      success_ = AssertSolution(result5_, expected5, output_, "5, 1", executionTime5_, finalResults_, success_);


        int a6 = 1;

        int b6 = 1;

      int expected6 = 2;

      auto start6_ = std::chrono::system_clock::now();
      auto result6_ = solution(a6, b6);
      auto executionTime6_ = (std::chrono::system_clock::now() - start6_).count();
      output_ = buffer_.str();
      buffer_.str("");
      success_ = AssertSolution(result6_, expected6, output_, "1, 1", executionTime6_, finalResults_, success_);


        int a7 = 2;

        int b7 = 2;

      int expected7 = 4;

      auto start7_ = std::chrono::system_clock::now();
      auto result7_ = solution(a7, b7);
      auto executionTime7_ = (std::chrono::system_clock::now() - start7_).count();
      output_ = buffer_.str();
      buffer_.str("");
      success_ = AssertSolution(result7_, expected7, output_, "2, 2", executionTime7_, finalResults_, success_);


        int a8 = 1;

        int b8 = 2;

      int expected8 = 3;

      auto start8_ = std::chrono::system_clock::now();
      auto result8_ = solution(a8, b8);
      auto executionTime8_ = (std::chrono::system_clock::now() - start8_).count();
      output_ = buffer_.str();
      buffer_.str("");
      success_ = AssertSolution(result8_, expected8, output_, "1, 2", executionTime8_, finalResults_, success_);


        int a9 = 3;

        int b9 = 2;

      int expected9 = 5;

      auto start9_ = std::chrono::system_clock::now();
      auto result9_ = solution(a9, b9);
      auto executionTime9_ = (std::chrono::system_clock::now() - start9_).count();
      output_ = buffer_.str();
      buffer_.str("");
      success_ = AssertSolution(result9_, expected9, output_, "3, 2", executionTime9_, finalResults_, success_);


        int a10 = 5;

        int b10 = 1;

      int expected10 = 6;

      auto start10_ = std::chrono::system_clock::now();
      auto result10_ = solution(a10, b10);
      auto executionTime10_ = (std::chrono::system_clock::now() - start10_).count();
      output_ = buffer_.str();
      buffer_.str("");
      success_ = AssertSolution(result10_, expected10, output_, "5, 1", executionTime10_, finalResults_, success_);


    if (success_) {
      json message = BuildMessage("ok", "__seed:120485622045101842__");
      finalResults_.push_back(message);
    }
  } catch (const std::exception& e) {
    json message = BuildMessage("error", e.what());
    finalResults_.push_back(message);
  }

  std::cout.rdbuf(oldBuf_);
  for_each(finalResults_.begin(), finalResults_.end(), SendMessage);
  cout << buffer_.str() << "\n";
}
