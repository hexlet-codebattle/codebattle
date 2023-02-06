require 'json'
require 'stringio'

module Runner
  def self.call(args_list)
    original_stdout = $stdout
    $stdout = StringIO.new
    @execution_result = []

    require_relative './check/solution'

    args_list.each do |arguments|
      starts_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)

      begin
        to_output(
          type: 'result',
          value: solution(*arguments),
          time: print_time(starts_at)
        )
      rescue StandardError => e
        to_output(
          type: 'error',
          value: e.message,
          time: print_time(starts_at)
        )
      end
    end
  rescue Exception => e
    @execution_result << JSON.dump(type: 'error', value: e)
  ensure
    $stdout = original_stdout
    puts @execution_result
  end

  def self.to_output(type: '', value: '', time: 0)
    @execution_result << JSON.dump(
      type: type,
      time: time,
      value: value,
      output: $stdout.string
    )

    $stdout.reopen
  end

  def self.print_time(time)
    format('%05.7f', (Process.clock_gettime(Process::CLOCK_MONOTONIC) - time))
  end
end
