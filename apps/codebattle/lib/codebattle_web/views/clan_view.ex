defmodule CodebattleWeb.ClanView do
  use CodebattleWeb, :view

  def sort_link(conn, label, field, current_sort, current_order) do
    next_order = next_order(field, current_sort, current_order)

    link("#{label} #{sort_marker(field, current_sort, current_order)}",
      to: Routes.clan_path(conn, :index, sort: field, order: next_order),
      class: "cb-text"
    )
  end

  def format_inserted_at(nil), do: "-"

  def format_inserted_at(%NaiveDateTime{} = datetime) do
    Calendar.strftime(datetime, "%Y-%m-%d %H:%M")
  end

  defp next_order(field, current_sort, "asc") when field == current_sort, do: "desc"
  defp next_order(_field, _current_sort, _current_order), do: "asc"

  defp sort_marker(field, current_sort, "asc") when field == current_sort, do: "^"
  defp sort_marker(field, current_sort, "desc") when field == current_sort, do: "v"
  defp sort_marker(_field, _current_sort, _current_order), do: ""
end
