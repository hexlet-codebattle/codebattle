require './solution'
require 'json'
require 'test/unit'
extend Test::Unit::Assertions

STDIN.read.split("\n").each do |line|
  $checks = []
  $checks.push(JSON.parse(line))
  # p line
end

$checks.each do |check|
  if check['check']
    puts check['check']
  else
    result = method(:solution).call(*check['arguments'])
    assert_equal(result, check['expected'])
  end
end
