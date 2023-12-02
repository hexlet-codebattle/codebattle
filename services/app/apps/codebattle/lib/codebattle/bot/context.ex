defmodule Codebattle.Bot.Context do
  @moduledoc "Interaction with bots"
  import Ecto.Query

  alias Codebattle.Bot.Server
  alias Codebattle.Game
  alias Codebattle.Repo
  alias Codebattle.User

  @spec start_bots(Game.t()) :: :ok
  def start_bots(%{is_bot: false}), do: :ok

  def start_bots(game) do
    bots = Game.Helpers.get_bots(game)

    [{supervisor, _}] = Registry.lookup(Codebattle.Registry, "bot_sup:#{game.id}")

    Enum.each(bots, fn bot ->
      Supervisor.start_child(
        supervisor,
        %{
          id: "bot_server_#{game.id}:#{bot.id}",
          restart: :transient,
          type: :worker,
          start: {Server, :start_link, [%{game: game, bot_id: bot.id}]}
        }
      )
    end)
  end

  @spec build(map()) :: User.t()
  def build(params \\ %{}) do
    bots_query()
    |> Repo.one!()
    |> Map.merge(params)
  end

  @spec build_list(pos_integer(), map()) :: list(User.t())
  def build_list(count, params \\ %{}) do
    count
    |> bots_query()
    |> Repo.all()
    |> Enum.map(&Map.merge(&1, params))
  end

  defp bots_query(limit \\ 1) do
    from(
      user in User,
      where: user.is_bot == true,
      order_by: fragment("RANDOM()"),
      limit: ^limit
    )
  end
end
