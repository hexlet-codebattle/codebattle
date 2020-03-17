import 'package:test/test.dart';
import 'package:dart_json/dart_json.dart';

import 'package:dart/solution_example.dart';

void main() {
  test("Run Asserts", () {
    var success = true;

    success = assert_solution(solution(1, 2), 3, [1, 2], success);
    success = assert_solution(solution(6, 10), 16, [6, 10], success);

    if (success) {
      print_message({'status': 'ok', 'result': '__code-0__'});
    }
  });
}

bool assert_solution(result, expected, arguments, success) {
  try {
    expect(expected, equals(result));
    print_message({'status': 'success', 'result': result});
  } catch (e) {
    print_message({'status': 'failure', 'result': result, 'arguments': arguments});
    return false;
  }

  return success;
}

void print_message(json) {
  print(Json.serialize(json));
}
