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

  def extract_run_error(%{"body" => %{"error" => error}}) when is_binary(error), do: error
  def extract_run_error(%{"error" => error}) when is_binary(error), do: error
  def extract_run_error(_result), do: "error"
end
