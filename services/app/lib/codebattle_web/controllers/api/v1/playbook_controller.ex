defmodule CodebattleWeb.Api.V1.PlaybookController do
  use CodebattleWeb, :controller

  alias Codebattle.{Game, Repo, Task}
  alias Codebattle.Bot.Playbook
  import Ecto.Query, warn: false

  def show(conn, %{"id" => game_id}) do
    query =
      from(
        p in Playbook,
        where: p.game_id == ^game_id,
        limit: 1
      )

    playbook = Repo.one(query)
    game = Repo.get!(Game, game_id)
    task = Repo.get!(Task, game.task_id)

    json(conn, %{
      players: playbook.data.players,
      records: playbook.data.records,
      task: task,
      type: game.type,
      tournament_id: game.tournament_id,
      winner_id: playbook.winner_id,
      winner_lang: playbook.winner_lang
    })
  end
end
