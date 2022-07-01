defmodule Codebattle.Bot.Factory do
  @moduledoc """
    generate bots for different environments
  """
  import Ecto.Query

  alias Codebattle.User
  alias Codebattle.Repo

  def build(params \\ %{}) do
    query()
    |> Repo.one!()
    |> Map.merge(params)
  end

  def build_list(count, params \\ %{}) do
    count
    |> query()
    |> Repo.all()
    |> Enum.map(&Map.merge(&1, params))
  end

  defp query(limit \\ 1) do
    from(
      user in User,
      where: user.is_bot == true,
      order_by: fragment("RANDOM()"),
      limit: ^limit
    )
  end
end
