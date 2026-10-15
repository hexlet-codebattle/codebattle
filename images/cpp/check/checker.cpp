#include "solution.cpp"

int main() {
  std::stringstream buffer_;
  std::streambuf * oldBuf_ = std::cout.rdbuf(buffer_.rdbuf());
  std::vector<std::string> finalResults_;

  try {
    int a1 = 1;
    int b1 = 1;
    RunTest(finalResults_, buffer_, [&]{ return solution(a1, b1); });

    int a2 = 2;
    int b2 = 2;
    RunTest(finalResults_, buffer_, [&]{ return solution(a2, b2); });

    int a3 = 1;
    int b3 = 2;
    RunTest(finalResults_, buffer_, [&]{ return solution(a3, b3); });

    int a4 = 3;
    int b4 = 2;
    RunTest(finalResults_, buffer_, [&]{ return solution(a4, b4); });

    int a5 = 5;
    int b5 = 1;
    RunTest(finalResults_, buffer_, [&]{ return solution(a5, b5); });

    int a6 = 10;
    int b6 = 0;
    RunTest(finalResults_, buffer_, [&]{ return solution(a6, b6); });

    int a7 = 20;
    int b7 = 2;
    RunTest(finalResults_, buffer_, [&]{ return solution(a7, b7); });

    int a8 = 10;
    int b8 = 2;
    RunTest(finalResults_, buffer_, [&]{ return solution(a8, b8); });

    int a9 = 30;
    int b9 = 2;
    RunTest(finalResults_, buffer_, [&]{ return solution(a9, b9); });

    int a10 = 50;
    int b10 = 1;
    RunTest(finalResults_, buffer_, [&]{ return solution(a10, b10); });
  } catch (const std::exception& e) {
    SendError(finalResults_, e.what());
  }

  std::cout.rdbuf(oldBuf_);
  for (auto const& s : finalResults_) std::cout << s << "\n";
  std::cout << buffer_.str() << "\n";
}
