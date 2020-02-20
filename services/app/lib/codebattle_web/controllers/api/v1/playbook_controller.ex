defmodule CodebattleWeb.Api.V1.PlaybookController do
  use CodebattleWeb, :controller

  alias Codebattle.{Repo, Task}
  alias Codebattle.Bot.Playbook
  import Ecto.Query, warn: false

  def show(conn, %{"id" => game_id}) do
    query =
      from(
        p in Playbook,
        where: p.game_id == ^game_id
      )

    playbook = Repo.one(query)
    task = Repo.get(Task, playbook.task_id)

    json(conn, %{
      players: playbook.data.players,
      records: playbook.data.records,
      task: task,
      winner_id: playbook.winner_id,
      winner_lang: playbook.winner_lang
    })
  end
end
