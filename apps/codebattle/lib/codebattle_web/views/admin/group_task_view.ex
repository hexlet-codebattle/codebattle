defmodule CodebattleWeb.Admin.GroupTaskView do
  use CodebattleWeb, :view

  def format_datetime(nil), do: "none"

  def format_datetime(%NaiveDateTime{} = datetime) do
    datetime
    |> DateTime.from_naive!("UTC")
    |> format_datetime()
  end

  def format_datetime(%DateTime{} = datetime) do
    Timex.format!(datetime, "%Y-%m-%d %H:%M:%S %Z", :strftime)
  end
end
