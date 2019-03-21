defmodule Codebattle.Bot.GameCreator do
  alias Codebattle.GameProcess.Play
  alias Codebattle.Repo
  alias Codebattle.Bot.Playbook

  import Ecto.Query, warn: false

  def call() do
    # TODO: think about more smart solution
    if Play.list_games() |> Enum.count() < 5 do
      query =
        from(
          playbook in Playbook,
          preload: [:task],
          order_by: fragment("RANDOM()"),
          limit: 1
        )

      playbook = Repo.one(query)

      if playbook do
        bot = Codebattle.Bot.Builder.build(%{lang: "ruby"})

        {:ok, game_id} = Play.create_bot_game(bot, playbook.task)
        {:ok, game_id, playbook.task.id}
      else

        {:error, :no_playbooks}
      end
    else

      {:error, :game_limit}
    end
  end
end
