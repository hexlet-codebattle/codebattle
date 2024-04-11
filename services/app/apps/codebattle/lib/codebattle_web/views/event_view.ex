defmodule CodebattleWeb.EventView do
  use CodebattleWeb, :view

  def format_datetime(nil), do: "none"
  def format_datetime(nil, _time_zone), do: "none"

  def format_datetime(datetime = %NaiveDateTime{}, timezone) do
    datetime
    |> DateTime.from_naive!("UTC")
    |> format_datetime(timezone)
  end

  def format_datetime(datetime = %DateTime{}, timezone \\ "UTC") do
    datetime
    |> DateTime.shift_zone!(timezone)
    |> Timex.format!("%Y-%m-%d %H:%M %Z", :strftime)
  end
end
