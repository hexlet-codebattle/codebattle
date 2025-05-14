import Foundation

// MARK: - DTO
struct Result: Codable {
    let type: String      // "result"
    var value: Int64
    var time: String      // seconds with 7-digit precision
    var output: String?
}

// MARK: - Harness
private func runTest(_ a: Int64, _ b: Int64) -> Result {
    // 1. redirect STDOUT so we can capture `print` output from the user’s code
    let savedStdout = dup(STDOUT_FILENO)
    let pipe        = Pipe()
    dup2(pipe.fileHandleForWriting.fileDescriptor, STDOUT_FILENO)

    // 2. run the solution ----------------------------------------------------
    let t0  = DispatchTime.now()
    let v   = solution(a: a, b: b)
    let dt  = DispatchTime.now().uptimeNanoseconds - t0.uptimeNanoseconds
    // -----------------------------------------------------------------------

    fflush(stdout)
    pipe.fileHandleForWriting.closeFile()
    dup2(savedStdout, STDOUT_FILENO)            // restore real STDOUT
    close(savedStdout)

    let data   = pipe.fileHandleForReading.readDataToEndOfFile()
    let output = String(data: data, encoding: .utf8)
    pipe.fileHandleForReading.closeFile()

    return Result(
        type:  "result",
        value: v,
        time:  String(format: "%.7f", Double(dt) / 1_000_000_000),
        output: output?.isEmpty == false ? output : nil
    )
}

// MARK: - Entry-point
@main
struct Checker {
    static func main() {
        let tests: [(Int64, Int64)] = [
            (1, 1),  (2, 2),  (1, 2),  (3, 2),  (5, 1),
            (10, 0), (20, 2), (10, 2), (30, 2), (50, 1)
        ]

        let results = tests.map(runTest)

        let encoder = JSONEncoder()
        if let json = try? encoder.encode(results) {
            print(String(decoding: json, as: UTF8.self))
        } else {
            fputs("JSON encoding error\n", stderr)
        }
    }
}