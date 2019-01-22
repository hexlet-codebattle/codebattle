defmodule Codebattle.Bot.GameCreator do
  alias Codebattle.GameProcess.Play
  alias Codebattle.Repo
  alias Codebattle.Bot.{Playbook, SocketDriver}

  import Ecto.Query, warn: false

  def call() do
    # TODO: think about more smart solution
    if Play.list_games() |> Enum.count() < 3 do
      query =
        from(
          playbook in Playbook,
          where: [lang: "ruby"],
          preload: [:task]
        )

      playbook = Repo.one(query)

      bot = Codebattle.Bot.Builder.build(%{lang: "ruby"})

      {:ok, socket_pid} =
        SocketDriver.start_link(CodebattleWeb.Endpoint, CodebattleWeb.UserSocket)

      {:ok, game_id} = Play.create_bot_game(bot, playbook.task)

      #TODO: add socket with bot to game process
      game_topic = "game:#{game_id}"
      SocketDriver.join(socket_pid, game_topic)

      {:ok, game_id}
    end
  end
end
