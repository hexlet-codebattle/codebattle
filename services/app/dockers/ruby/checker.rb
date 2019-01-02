require 'json'
require 'test/unit'
$stdout = STDERR

extend Test::Unit::Assertions

checks = []

STDIN.read.split("\n").each do |line|
  checks.push(JSON.parse(line))
end

begin
  require './check/solution'

  checks.each do |element|
    if element['check']
      puts JSON.dump(
        status: :ok,
        result: element['check']
      )
    else
      result = method(:solution).call(*element['arguments'])
      begin
        assert_equal(element['expected'], result)
      rescue Test::Unit::AssertionFailedError
        puts JSON.dump(
          status: :failure,
          result: element['arguments']
        )
        exit(0)
      end
    end
  end
rescue Exception => e
  puts(JSON.dump(
         status: :error,
         result: e.message
       ))
  exit(0)
end
