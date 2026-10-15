defmodule CodebattleWeb.Admin.TournamentDuplicatorController do
  use CodebattleWeb, :controller

  alias Codebattle.Tournament

  plug(CodebattleWeb.Plugs.AdminOnly)
  plug(:put_view, CodebattleWeb.Admin.TournamentDuplicatorView)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :admin})

  def new(conn, _params) do
    render(conn, "new.html", user: conn.assigns.current_user)
  end

  def create(conn, %{"tournament_id" => tournament_id, "count" => count}) do
    creator = conn.assigns.current_user

    with {id, ""} <- Integer.parse(String.trim(tournament_id)),
         {cnt, ""} when cnt > 0 and cnt <= 100 <- Integer.parse(String.trim(count)),
         %Tournament{} = tournament <- Tournament.Context.get_from_db(id) do
      case Tournament.Context.duplicate(tournament, creator, cnt) do
        {:ok, tournaments} ->
          conn
          |> put_flash(:info, "Successfully created #{length(tournaments)} tournament(s).")
          |> render("result.html",
            tournaments: tournaments,
            source: tournament,
            user: conn.assigns.current_user
          )

        {:error, errors} ->
          conn
          |> put_flash(:error, "Some tournaments failed to create: #{inspect(errors)}")
          |> render("new.html", user: conn.assigns.current_user)
      end
    else
      nil ->
        conn
        |> put_flash(:error, "Tournament not found.")
        |> render("new.html", user: conn.assigns.current_user)

      _ ->
        conn
        |> put_flash(:error, "Invalid input. Count must be between 1 and 100.")
        |> render("new.html", user: conn.assigns.current_user)
    end
  end
end
