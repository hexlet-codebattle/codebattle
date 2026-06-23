defmodule CodebattleWeb.Admin.SupportTournamentController do
  use CodebattleWeb, :controller

  alias Codebattle.SupportTournament

  plug(CodebattleWeb.Plugs.AdminOnly)
  plug(:put_view, CodebattleWeb.Admin.SupportTournamentView)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :admin})

  def edit(conn, _params) do
    render_form(conn, SupportTournament.get_config())
  end

  def update(conn, %{"support_tournament" => params}) do
    case SupportTournament.save_config(params) do
      {:ok, config} ->
        conn
        |> put_flash(:info, "Support tournament config updated.")
        |> render_form(config)

      {:error, reason} ->
        conn
        |> put_flash(:error, reason)
        |> render_form(%{
          tournament_ids: params["tournament_ids"] || "",
          group_tournament_ids: params["group_tournament_ids"] || "",
          text: params["text"] || ""
        })
    end
  end

  def update(conn, _params) do
    conn
    |> put_flash(:error, "Invalid support tournament config.")
    |> render_form(SupportTournament.get_config())
  end

  defp render_form(conn, config) do
    render(conn, "edit.html",
      config: config,
      tournament_ids: format_config_ids(config.tournament_ids),
      group_tournament_ids: format_config_ids(config.group_tournament_ids),
      text: Map.get(config, :text, ""),
      user: conn.assigns.current_user
    )
  end

  defp format_config_ids(ids) when is_list(ids), do: SupportTournament.format_ids(ids)
  defp format_config_ids(ids) when is_binary(ids), do: ids
  defp format_config_ids(_ids), do: ""
end
