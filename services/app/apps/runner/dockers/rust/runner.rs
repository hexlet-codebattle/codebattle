// include!("solution");
//
//fn call(args_list)
//for each args_list call solutiona
//and write result into object
//return result list of results
    // error result JSON.dump(type: '', value: e)
    // normal_result
    /* JSON.dump(
      time: time,
      value: value,
      output: $stdout.string
    ) */
values = [[0, 1], [1,1], [1,0]]

global_result = []
foreach values, fn args do
try
output = capture_output
  timer.start
    restul  = solution(*args)
  timer.end

  (type: "result", time: timer.duration, value: restul, output: output)
 global_result  << restul
catch error
  (type: "error", value: error)
 global_result  << error_result
end
end
