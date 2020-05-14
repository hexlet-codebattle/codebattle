import 'package:test/test.dart';
import 'package:dart_json/dart_json.dart';
import 'dart:async';

import 'package:check/solution_example.dart';

void main() {
  test("Run Asserts", () {
    bool success = true;
    var asserts = [];
    var output = "";

    var startTime;
    var result;
    var executionTime;

    runZoned(() {
      startTime = new DateTime.now().millisecondsSinceEpoch;
      result = solution(1, 2);
      executionTime = new DateTime.now().millisecondsSinceEpoch - startTime;
      success = assert_solution(result, 3, [1, 2], output, asserts, executionTime, success);
      output = "";

      startTime = new DateTime.now().millisecondsSinceEpoch;
      result = solution(6, 10);
      executionTime = new DateTime.now().millisecondsSinceEpoch - startTime;
      success = assert_solution(result, 16, [6, 10], output, asserts, executionTime, success);
      output = "";
    }, zoneSpecification: new ZoneSpecification(
      print: (Zone self, ZoneDelegate parent, Zone zone, String line) {
        output += line + "\n";
      }
    ));

    asserts.forEach(
      (message) => print_message(message)
    );

    if (success) {
      print_message({'status': 'ok', 'result': '__code-0__'});
    }
  });
}

bool assert_solution(result, expected, arguments, output, asserts, executionTime, success) {
  try {
    expect(expected, equals(result));
    asserts.add({
      'status': 'success',
      'result': result,
      'output': output,
      'expected': expected,
      'arguments': arguments,
      'execution_time': executionTime
    });
  } catch (e) {
    asserts.add({
      'status': 'failure',
      'result': result,
      'output': output,
      'expected': expected,
      'arguments': arguments,
      'execution_time': executionTime
    });
    return false;
  }

  return success;
}

void print_message(json) {
  print(Json.serialize(json));
}
