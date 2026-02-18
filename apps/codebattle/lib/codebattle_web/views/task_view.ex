defmodule CodebattleWeb.TaskView do
  use CodebattleWeb, :view

  def render_base_errors(nil), do: nil
  def render_base_errors(errors), do: elem(errors, 0)

  def render_tags(task), do: Enum.join(task.tags, ", ")

  def render_asserts(task) do
    Jason.encode!(task.asserts)
  end

  def render_markdown(nil), do: ""
  def render_markdown(""), do: ""
  def render_markdown(text), do: Earmark.as_html!(text, compact_output: true)

  def csrf_token do
    Plug.CSRFProtection.get_csrf_token()
  end

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
