defmodule TimeHelper do
  def utc_now do
    if Mix.env() != :test do
      NaiveDateTime.utc_now() |> NaiveDateTime.truncate(:second)
    else
      ~N[2019-01-05 19:11:45.001704] |> NaiveDateTime.truncate(:second)
    end
  end
end
