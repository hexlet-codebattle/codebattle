require 'json'
require 'test/unit'
$stdout = STDERR

extend Test::Unit::Assertions

begin
  require './solution_example'

  success = true

  def assert_result(result, expected, error_message, success)
    begin
      assert_equal(expected, result)

      puts JSON.dump(
        status: :success,
        result: result
      )
      success
    rescue Test::Unit::AssertionFailedError
      puts JSON.dump(
        status: :failure,
        result: result,
        arguments: error_message
      )
      false
    end
  end

  success = assert_result(method(:solution).call(1, 2), 3, [1, 2], success)
  success = assert_result(method(:solution).call(5, 3), 8, [5, 3], success)

  if success
    puts JSON.dump(
      status: :ok,
      result: '__code-0__'
    )
  end
rescue Exception => e
  puts(JSON.dump(
         status: :error,
         result: e.message
       ))
  exit(0)
end
