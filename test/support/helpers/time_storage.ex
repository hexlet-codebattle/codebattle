defmodule Helpers.TimeStorage do
  def start_link do
    Agent.start_link(fn ->
      {0,
        [~N[2017-10-04 15:15:15.1000],
         ~N[2017-10-04 15:15:15.2000],
         ~N[2017-10-04 15:15:15.4000],
         ~N[2017-10-04 15:15:15.7000],
         ~N[2017-10-04 15:15:16.0000],
         ~N[2017-10-04 15:15:16.4000],
         ~N[2017-10-04 15:15:16.9000],
         ~N[2017-10-04 15:15:17.5000]]
      }
    end, name: __MODULE__)
  end

  def next do
    {i, time} = Agent.get(__MODULE__, fn (state) ->
      {i, list} = state
      {i, Enum.at(list, i)}
    end)

    Agent.update(__MODULE__, fn(state) ->
      {j, list} = state
      {i + 1, list}
    end)
    time
  end
end
