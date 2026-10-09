// Helpers for the generated checker: run one test with stdout captured and emit one JSON
// line per test in the codebattle output v2 format (same shape as the C++ runtime).
module cb_runtime;

import std.datetime.stopwatch : AutoStart, StopWatch;
import std.format : format;
import std.json : JSONValue;
import std.stdio : File, stdout, writeln;

string runTest(F)(F fn) {
    auto capture = File.tmpfile();
    auto saved = stdout;
    stdout = capture;
    scope (exit) stdout = saved;

    auto sw = StopWatch(AutoStart.yes);
    auto value = fn();
    sw.stop();

    capture.flush();
    stdout = saved;

    capture.rewind();
    string output;
    foreach (chunk; capture.byChunk(4096))
        output ~= cast(string) chunk.idup;

    return JSONValue([
        "type": JSONValue("result"),
        "value": JSONValue(value),
        "output": JSONValue(output),
        "time": JSONValue(format("%.7f", sw.peek.total!"nsecs" / 1e9)),
    ]).toString();
}

string errorLine(string message) {
    return JSONValue(["type": JSONValue("error"), "value": JSONValue(message)]).toString();
}

void finish(string[] lines) {
    foreach (line; lines)
        writeln(line);
}
