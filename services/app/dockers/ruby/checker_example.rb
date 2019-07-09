require 'json'
require 'test/unit'
$stdout = STDERR

extend Test::Unit::Assertions

begin
  require './solution_example'

  def assert_result(result, expected, error_message)
    begin
      assert_equal(expected, result)
    rescue Test::Unit::AssertionFailedError
      puts JSON.dump(
        status: :failure,
        result: error_message
      )
      exit(0)
    end
  end

  assert_result(method(:solution).call(1, 2), 3, '[1, 2]')
  assert_result(method(:solution).call(5, 3), 8, '[5, 3]')
  puts JSON.dump(
    status: :ok,
    result: '__code-0__'
  )
rescue Exception => e
  puts(JSON.dump(
         status: :error,
         result: e.message
       ))
  exit(0)
end
