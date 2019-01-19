defmodule Codebattle.Bot.Creator do
  alias Codebattle.GameProcess.Play
  alias Codebattle.Bot.Playbook
  alias Codebattle.Repo

  import Ecto.Query, warn: false

  def call() do
    if (Play.list_games |> Enum.count) < 3 do
      query =
        from(
          playbook in Playbook,
          where: [lang: "ruby"],
          preload: [:task]
        )

      playbook = Repo.one(query)

      bot = Codebattle.Bot.Builder.build(%{lang: "ruby"})

      Play.create_bot_game(bot, playbook.task)
    end
  end
end
