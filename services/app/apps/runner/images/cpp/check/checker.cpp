#include "../json.hpp"
#include "../fifo_map.hpp"

#include "solution.cpp"

using namespace std;

template<class K, class V, class dummy_compare, class A>
using fifo_map = nlohmann::fifo_map<K, V, nlohmann::fifo_map_compare<K>, A>;
using json = nlohmann::basic_json<fifo_map>;

template <typename T1>
json BuildResultMessage(string status, T1 result, string output, string executionTime) {
  json j;
  j["type"] = status;
  j["value"] = result;
  j["output"] = output;
  j["time"] = executionTime;

  return j;
}


void SendMessage(json j) {
  cout << j << "\n";
}

template <typename T>
json BuildErrorMessage(string status, T result) {
  json j;
  j["type"] = status;
  j["value"] = result;

  return j;
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
      

      auto start1_ = std::chrono::high_resolution_clock::now();
      auto result1_ = solution(a1, b1);
      std::chrono::duration<double> executionTime1_ = std::chrono::high_resolution_clock::now() - start1_;
      char buffer1_[20];
      std::sprintf(buffer1_, "%.7f", executionTime1_.count());
      auto time1_ = std::string(buffer1_);
      output_ = buffer_.str();
      buffer_.str("");
      finalResults_.push_back(BuildResultMessage("result", result1_, output_,  time1_));
    
      
        int a2 = 2;
      
        int b2 = 2;
      

      auto start2_ = std::chrono::high_resolution_clock::now();
      auto result2_ = solution(a2, b2);
      std::chrono::duration<double> executionTime2_ = std::chrono::high_resolution_clock::now() - start2_;
      char buffer2_[20];
      std::sprintf(buffer2_, "%.7f", executionTime2_.count());
      auto time2_ = std::string(buffer2_);
      output_ = buffer_.str();
      buffer_.str("");
      finalResults_.push_back(BuildResultMessage("result", result2_, output_,  time2_));
    
      
        int a3 = 1;
      
        int b3 = 2;
      

      auto start3_ = std::chrono::high_resolution_clock::now();
      auto result3_ = solution(a3, b3);
      std::chrono::duration<double> executionTime3_ = std::chrono::high_resolution_clock::now() - start3_;
      char buffer3_[20];
      std::sprintf(buffer3_, "%.7f", executionTime3_.count());
      auto time3_ = std::string(buffer3_);
      output_ = buffer_.str();
      buffer_.str("");
      finalResults_.push_back(BuildResultMessage("result", result3_, output_,  time3_));
    
      
        int a4 = 3;
      
        int b4 = 2;
      

      auto start4_ = std::chrono::high_resolution_clock::now();
      auto result4_ = solution(a4, b4);
      std::chrono::duration<double> executionTime4_ = std::chrono::high_resolution_clock::now() - start4_;
      char buffer4_[20];
      std::sprintf(buffer4_, "%.7f", executionTime4_.count());
      auto time4_ = std::string(buffer4_);
      output_ = buffer_.str();
      buffer_.str("");
      finalResults_.push_back(BuildResultMessage("result", result4_, output_,  time4_));
    
      
        int a5 = 5;
      
        int b5 = 1;
      

      auto start5_ = std::chrono::high_resolution_clock::now();
      auto result5_ = solution(a5, b5);
      std::chrono::duration<double> executionTime5_ = std::chrono::high_resolution_clock::now() - start5_;
      char buffer5_[20];
      std::sprintf(buffer5_, "%.7f", executionTime5_.count());
      auto time5_ = std::string(buffer5_);
      output_ = buffer_.str();
      buffer_.str("");
      finalResults_.push_back(BuildResultMessage("result", result5_, output_,  time5_));
    
      
        int a6 = 10;
      
        int b6 = 0;
      

      auto start6_ = std::chrono::high_resolution_clock::now();
      auto result6_ = solution(a6, b6);
      std::chrono::duration<double> executionTime6_ = std::chrono::high_resolution_clock::now() - start6_;
      char buffer6_[20];
      std::sprintf(buffer6_, "%.7f", executionTime6_.count());
      auto time6_ = std::string(buffer6_);
      output_ = buffer_.str();
      buffer_.str("");
      finalResults_.push_back(BuildResultMessage("result", result6_, output_,  time6_));
    
      
        int a7 = 20;
      
        int b7 = 2;
      

      auto start7_ = std::chrono::high_resolution_clock::now();
      auto result7_ = solution(a7, b7);
      std::chrono::duration<double> executionTime7_ = std::chrono::high_resolution_clock::now() - start7_;
      char buffer7_[20];
      std::sprintf(buffer7_, "%.7f", executionTime7_.count());
      auto time7_ = std::string(buffer7_);
      output_ = buffer_.str();
      buffer_.str("");
      finalResults_.push_back(BuildResultMessage("result", result7_, output_,  time7_));
    
      
        int a8 = 10;
      
        int b8 = 2;
      

      auto start8_ = std::chrono::high_resolution_clock::now();
      auto result8_ = solution(a8, b8);
      std::chrono::duration<double> executionTime8_ = std::chrono::high_resolution_clock::now() - start8_;
      char buffer8_[20];
      std::sprintf(buffer8_, "%.7f", executionTime8_.count());
      auto time8_ = std::string(buffer8_);
      output_ = buffer_.str();
      buffer_.str("");
      finalResults_.push_back(BuildResultMessage("result", result8_, output_,  time8_));
    
      
        int a9 = 30;
      
        int b9 = 2;
      

      auto start9_ = std::chrono::high_resolution_clock::now();
      auto result9_ = solution(a9, b9);
      std::chrono::duration<double> executionTime9_ = std::chrono::high_resolution_clock::now() - start9_;
      char buffer9_[20];
      std::sprintf(buffer9_, "%.7f", executionTime9_.count());
      auto time9_ = std::string(buffer9_);
      output_ = buffer_.str();
      buffer_.str("");
      finalResults_.push_back(BuildResultMessage("result", result9_, output_,  time9_));
    
      
        int a10 = 50;
      
        int b10 = 1;
      

      auto start10_ = std::chrono::high_resolution_clock::now();
      auto result10_ = solution(a10, b10);
      std::chrono::duration<double> executionTime10_ = std::chrono::high_resolution_clock::now() - start10_;
      char buffer10_[20];
      std::sprintf(buffer10_, "%.7f", executionTime10_.count());
      auto time10_ = std::string(buffer10_);
      output_ = buffer_.str();
      buffer_.str("");
      finalResults_.push_back(BuildResultMessage("result", result10_, output_,  time10_));
    

  } catch (const std::exception& e) {
    json message = BuildErrorMessage("error", e.what());
    finalResults_.push_back(message);
  }

  std::cout.rdbuf(oldBuf_);
  for_each(finalResults_.begin(), finalResults_.end(), SendMessage);
  cout << buffer_.str() << "\n";
}
