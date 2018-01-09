require './check/solution'
require 'json'
require 'test/unit'
extend Test::Unit::Assertions

checks = []

STDIN.read.split("\n").each do |line|
  checks.push(JSON.parse(line))
  # p line
end

checks.each do |check|
  if check['check']
    print check['check']
  else
    result = method(:solution).call(*check['arguments'])
    assert_equal(result, check['expected'])
  end
end
