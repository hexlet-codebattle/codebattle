static import solution;
import cb_runtime;

void main() {
    string[] results;

    try {
        {
            long a1 = 1;
            long b1 = 2;
            results ~= runTest(() => solution.solution(a1, b1));
        }
    } catch (Throwable e) {
        results ~= errorLine(e.msg);
    }

    finish(results);
}
