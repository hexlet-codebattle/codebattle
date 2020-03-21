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

  def assert_result(result, expected, arguments, success)
    begin
      assert_equal(expected, result)

      @execution_result <<
        JSON.dump(
          status: :success,
          result: result,
          output: $stdout.string,
          expected: expected,
          arguments: arguments
        )
      success
    rescue Test::Unit::AssertionFailedError
      @execution_result <<
        JSON.dump(
          status: :failure,
          result: result,
          output: $stdout.string,
          expected: expected,
          arguments: arguments
        )
      false
    end
  end

  success = assert_result(method(:solution).call(1, 2), 3, [1, 2], success)
  success = assert_result(method(:solution).call(5, 3), 8, [5, 3], success)
  if success
    @execution_result <<
      JSON.dump(
        status: :ok,
        result: '__code-0__'
      )
  end
rescue Exception => e
  @execution_result <<
    JSON.dump(
      status: :error,
      result: e.message
    )
end

$stdout = original_stdout
puts @execution_result
