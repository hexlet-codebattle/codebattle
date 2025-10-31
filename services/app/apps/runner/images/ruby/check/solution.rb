def solution(numerator, denominator, _string, _float, _bool, _hash, _list_str, _list_list_str)
  res = numerator / denominator

  puts 'output-test'

  res
rescue StandardError => e
  puts("don't do it", e.message)
  raise 'AAAAAAAAA'
end
