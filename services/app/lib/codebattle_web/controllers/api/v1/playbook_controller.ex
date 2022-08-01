defmodule CodebattleWeb.Api.V1.PlaybookController do
  use CodebattleWeb, :controller

  alias Codebattle.{Game, Repo, User, Task}
  alias Codebattle.Game.{Helpers, Server}

  alias Codebattle.Playbook
  import Ecto.Query, warn: false

  def approve(conn, %{"game_id" => game_id}) do
    query =
      from(
        p in Playbook,
        where: p.game_id == ^game_id,
        limit: 1
      )

    if User.is_admin?(conn.assigns.current_user) do
      {:ok, playbook} =
        Repo.one(query) |> Playbook.changeset(%{solution_type: "complete"}) |> Repo.update()

      json(conn, %{
        solution_type: playbook.solution_type
      })
    else
      json(conn, %{
        errors: ["is_not_admin"]
      })
    end
  end

  def reject(conn, %{"game_id" => game_id}) do
    query =
      from(
        p in Playbook,
        where: p.game_id == ^game_id,
        limit: 1
      )

    if User.is_admin?(conn.assigns.current_user) do
      {:ok, playbook} =
        Repo.one(query) |> Playbook.changeset(%{solution_type: "baned"}) |> Repo.update()

      json(conn, %{
        solution_type: playbook.solution_type
      })
    else
      json(conn, %{
        errors: ["is_not_admin"]
      })
    end
  end

  def show(conn, %{"id" => game_id}) do
    query =
      from(
        p in Playbook,
        where: p.game_id == ^game_id,
        limit: 1
      )

    case Game.Context.get_game!(game_id) do
      game = %Game{is_live: true} ->
        {:ok, records} = Server.get_playbook(game_id)

        winner = Helpers.get_winner(game)
        winner_id = if is_nil(winner), do: nil, else: winner.id
        winner_lang = if is_nil(winner), do: nil, else: winner.editor_lang

        json(conn, %{
          players: Helpers.get_players(game),
          records: Enum.reverse(records),
          task: Helpers.get_task(game),
          type: Helpers.get_type(game),
          solution_type: "incomplete",
          tournament_id: Helpers.get_tournament_id(game),
          winner_id: winner_id,
          winner_lang: winner_lang
        })

      game ->
        playbook = Repo.one(query)
        task = Repo.get(Task, playbook.task_id)

        json(conn, %{
          players: playbook.data.players,
          records: playbook.data.records,
          task: task,
          type: game.type,
          solution_type: playbook.solution_type,
          tournament_id: game.tournament_id,
          winner_id: playbook.winner_id,
          winner_lang: playbook.winner_lang
        })
    end
  end
end
