require 'json'
require 'stringio'

module Checker
  def self.call
    original_stdout = $stdout
    $stdout = StringIO.new
    @execution_result = []
    args_list = JSON.parse(File.read(File.join(__dir__, './check/asserts.json')))

    require_relative './check/solution'

    args_list['arguments'].each do |arguments|
      starts_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)

      begin
        to_output(
          type: 'result',
          value: solution(*arguments),
          time: print_time(starts_at)
        )
        $stdout.reopen
      rescue StandardError => e
        to_output(
          type: 'error',
          value: e.message,
          time: print_time(starts_at)
        )
      end
      $stdout.reopen
    end
  rescue Exception => e
    @execution_result << { type: 'error', value: e }
  ensure
    $stdout = original_stdout
    puts JSON.dump(@execution_result)
  end

  def self.to_output(type: '', value: '', time: 0)
    @execution_result << {
      type: type,
      time: time,
      value: value,
      output: $stdout.string
    }
  end

  def self.print_time(time)
    format('%05.7f', (Process.clock_gettime(Process::CLOCK_MONOTONIC) - time))
  end
end

Checker.call
