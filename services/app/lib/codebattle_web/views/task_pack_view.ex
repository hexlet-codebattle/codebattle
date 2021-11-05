defmodule CodebattleWeb.TaskPackView do
  use CodebattleWeb, :view

  def render_base_errors(nil), do: nil
  def render_base_errors(errors), do: elem(errors, 0)

  def render_task_ids(task), do: Enum.join(task.task_ids, ", ")

  def render_asserts(task) do
    task.asserts |> String.split("\n", trim: false) |> Enum.intersperse(Phoenix.HTML.Tag.tag(:br))
  end

  def render_markdown(nil), do: ""
  def render_markdown(""), do: ""
  def render_markdown(text), do: Earmark.as_html!(text, compact_output: true)
end
