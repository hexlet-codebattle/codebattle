defmodule CodebattleWeb.SupportTournamentView do
  use CodebattleWeb, :view

  def render_markdown(nil), do: ""
  def render_markdown(""), do: ""
  def render_markdown(text), do: Earmark.as_html!(text, compact_output: true)
end
