defmodule Helpers.TimeStorage do
  def start_link do
    Agent.start_link(fn ->
      {0,
        [~N[2017-10-04 15:15:15.1000],
         ~N[2017-10-04 15:15:15.2000],
         ~N[2017-10-04 15:15:15.3000],
         ~N[2017-10-04 15:15:15.3000],
         ~N[2017-10-04 15:15:15.3000],
         ~N[2017-10-04 15:15:15.3000],
         ~N[2017-10-04 15:15:15.4000],
         ~N[2017-10-04 15:15:15.5000]]
      }
    end, name: __MODULE__)
  end

  def next do
    {i, time} = Agent.get(__MODULE__, fn (state) ->
      {i, list} = state
      {i, Enum.at(list, i)}
    end)
    {i, time}

    Agent.update(__MODULE__, fn(state) ->
      {j, list} = state
      {i, list}
    end)
  end
end
