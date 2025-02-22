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
end
