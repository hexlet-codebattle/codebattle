defmodule TimeHelper do
  @moduledoc false
  def utc_now do
    if Application.get_env(:codebattle, :freeze_time) do
      ~N[2019-01-05 19:11:45]
    else
      NaiveDateTime.utc_now(:second)
    end
  end
end
