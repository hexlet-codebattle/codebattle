defmodule CodebattleWeb.EventView do
  use CodebattleWeb, :view

  def format_datetime(d, tz \\ "UTC")
  def format_datetime(nil, _time_zone), do: "none"

  def format_datetime(%NaiveDateTime{} = datetime, timezone) do
    datetime
    |> DateTime.from_naive!("UTC")
    |> format_datetime(timezone)
  end

  def format_datetime(%DateTime{} = datetime, timezone) do
    datetime
    |> DateTime.shift_zone!(timezone)
    |> Timex.format!("%Y-%m-%d %H:%M %Z", :strftime)
  end
end
