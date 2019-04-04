defmodule Codebattle.Bot.Builder do
  @moduledoc """
    generate bots for different environments
  """
  import Ecto.Query

  alias Codebattle.User
  alias Codebattle.Repo

  def build(params \\ %{}) do
    query =
      from(
        user in User,
        where: user.is_bot == true,
        order_by: fragment("RANDOM()"),
        limit: 1
      )

    bot = Repo.one(query)

    Map.merge(bot, params)
  end
end
