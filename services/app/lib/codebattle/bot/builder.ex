defmodule Codebattle.Bot.Builder do
  @moduledoc """
    generate bots for different environments
  """

  # alias Codebattle.User
  alias Codebattle.GameProcess.Player

  def build(params \\ %{}) do
    bot = %Player{id: "bot", name: "bot", bot: true, rating: 1137, github_id: "35539033"}
    Map.merge(bot, params)
  end
end
