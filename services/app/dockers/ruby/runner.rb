require 'json'
require 'stringio'

module Runner
  def self.call(args)
    original_stdout = $stdout
    $stdout = StringIO.new
    @execution_result = []

    require_relative './check/solution'

    args.each do |arguments|
      starts_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)

      begin
        to_output(
          type: 'result',
          value: solution(*arguments),
          time: (Process.clock_gettime(Process::CLOCK_MONOTONIC) - starts_at).round(7)
        )
      rescue StandardError => e
        to_output(
          type: 'error',
          value: e.message,
          time: (Process.clock_gettime(Process::CLOCK_MONOTONIC) - starts_at).round(7)
        )
      end
    end
  rescue Exception => e
    @execution_result << e.backtrace.join("\n")
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
end
