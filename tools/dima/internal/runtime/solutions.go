package runtime

const DefaultPythonSolution = `# loadtest python solution
def solution():
    return 42

if __name__ == "__main__":
    print(solution())
`

const DefaultCPPSolution = `// loadtest cpp solution
#include <iostream>

int solution() { return 42; }

int main() {
    std::cout << solution() << std::endl;
    return 0;
}
`
