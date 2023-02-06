defmodule TimeHelper do
  def utc_now do
    if Application.get_env(:codebattle, :freeze_time) do
      ~N[2019-01-05 19:11:45.001704] |> NaiveDateTime.truncate(:second)
    else
      NaiveDateTime.utc_now() |> NaiveDateTime.truncate(:second)
    end
  end
end
