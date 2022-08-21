Code.eval_file("./runner.exs")
Runner.call(Jason.decode!(Jason.encode!([[0, 1], [1, 1], [1, 0]])))
