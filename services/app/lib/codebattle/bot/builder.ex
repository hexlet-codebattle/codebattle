defmodule Codebattle.Bot.Builder do
  @moduledoc """
    generate bots for different environments
  """

  alias Codebattle.User

  def build(params \\ %{}) do
    bot = %User{id: (:rand.uniform(61000000) + 1000000), name: "superPlayer", bot: true, rating: 1137}
    Map.merge(bot, params)
  end
end
