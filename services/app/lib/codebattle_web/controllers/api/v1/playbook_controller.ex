defmodule CodebattleWeb.Api.V1.PlaybookController do
  use CodebattleWeb, :controller

  alias Codebattle.{Game, Repo, User, Task}
  alias Codebattle.Game.{GameHelpers, Play, Server}
  alias Codebattle.Bot.Playbook
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

    case Play.get_fsm(game_id) do
      {:ok, fsm} ->
        {:ok, records} = Server.get_playbook(game_id)

        winner = GameHelpers.get_winner(fsm)
        winner_id = if is_nil(winner), do: nil, else: winner.id
        winner_lang = if is_nil(winner), do: nil, else: winner.editor_lang

        json(conn, %{
          players: GameHelpers.get_players(fsm),
          records: Enum.reverse(records),
          task: GameHelpers.get_task(fsm),
          type: GameHelpers.get_type(fsm),
          solution_type: "incomplete",
          tournament_id: GameHelpers.get_tournament_id(fsm),
          winner_id: winner_id,
          winner_lang: winner_lang
        })

      _ ->
        playbook = Repo.one(query)
        game = Repo.get(Game, game_id)
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
