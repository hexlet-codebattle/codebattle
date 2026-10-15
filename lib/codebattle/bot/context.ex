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
    Map.merge(codebot(), params)
  end

  @spec build_list(pos_integer(), map()) :: list(User.t())
  def build_list(count, params \\ %{}) do
    bot = codebot()
    Enum.map(1..count, fn _ -> Map.merge(bot, params) end)
  end

  @spec get(pos_integer()) :: User.t() | nil
  def get(id) do
    case Repo.get(User, id) do
      %User{is_bot: true} = bot -> bot
      _ -> nil
    end
  end

  # There is a single canonical bot user ("Codebot") that solves every task.
  defp codebot do
    Repo.one!(
      from(
        user in User,
        where: user.is_bot == true,
        order_by: [asc: user.id],
        limit: 1
      )
    )
  end
end
