defmodule Codebattle.Bot.GameCreator do
  alias Codebattle.GameProcess.Play
  alias Codebattle.Repo
  alias Codebattle.Bot.Playbook

  import Ecto.Query, warn: false

  def call() do
    # TODO: think about more smart solution
    if Play.list_games() |> Enum.count() < 5 do
      level = ["elementary", "easy", "medium", "hard"] |> Enum.random()
      bot = Codebattle.Bot.Builder.build(%{"level" => level, "type" => "public"})

      {:ok, game_id} = Play.create_game(bot, %{"level" => level, "type" => "public"})
      {:ok, game_id}
      # query =
      #   from(
      #     playbook in Playbook,
      #     preload: [:task],
      #     order_by: fragment("RANDOM()"),
      #     limit: 1
      #   )

      # playbook = Repo.one(query)

      # if playbook do
      # else
      #   {:error, :no_playbooks}
      # end
    else
      {:error, :game_limit}
    end
  end
end
