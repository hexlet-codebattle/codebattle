# frozen_string_literal: true

require 'json'
require 'stringio'
require 'test/unit'

extend Test::Unit::Assertions

original_stdout = $stdout
$stdout = StringIO.new

@execution_result = []

begin
  require './solution_example'

  success = true

  def assert_result(solution, expected, arguments, success)
    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    result = solution.call(*arguments)
    finish = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    assert_equal(expected, result)

    @execution_result <<
      JSON.dump(
        status: :success,
        result: result,
        output: $stdout.string,
        expected: expected,
        arguments: arguments,
        execution_time: finish - start
      )
    $stdout.reopen
    success
  rescue Test::Unit::AssertionFailedError
    @execution_result <<
      JSON.dump(
        status: "failure",
        result: result,
        output: $stdout.string,
        expected: expected,
        arguments: arguments,
        execution_time: finish - start
      )
    $stdout.reopen
    false
  end

  success = assert_result(method(:solution), 3, [1, 2], success)
  success = assert_result(method(:solution), 8, [5, 3], success)
  if success
    @execution_result <<
      JSON.dump(
        status: :ok,
        result: '__code-0__'
      )
  end
rescue Exception => e
  @execution_result <<
    JSON.dump( status: "error", result: e.message)
end

$stdout = original_stdout
puts @execution_result
