def solution(numerator, denominator)
  res = numerator / denominator

  puts 'output-test'

  res
rescue StandardError => e
  puts("don't do it", e.message)
  raise 'AAAAAAAAA'
end
