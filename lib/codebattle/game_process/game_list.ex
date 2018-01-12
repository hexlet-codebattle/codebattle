defmodule Codebattle.GameProcess.GameList do
  @moduledoc """
    GameList for game list
  """
  alias Codebattle.GameProcess.FsmHelpers

  def new do
    :ets.new(:game_list, [:ordered_set, :public, :named_table])
  end

  def create_game(user, fsm) do
    # {1, %{user_id => {}, user_id => {}, game: game}}
    game_id = fsm.data.game_id
    users = %{user.id => user}
    game_params = %{
      level: fsm.data.task.level,
      state: fsm.state
    }

    :ets.insert(:game_list, {game_key(game_id), users, game_params})
  end

  def create_game(user, fsm) do
    # {1, %{user_id => {}, user_id => {}}, %{level: "easy", state: :playing}}
    case playing?(user) do
      true -> :error
      false ->
        game_id = fsm.data.game_id
        users = %{user.id => user}
        game_params = %{
          level: fsm.data.task.level,
          state: fsm.state
        }
        :ets.insert(:game_list, {game_key(game_id), users, game_params})
        :ok
    end
  end

  def join_game(user, fsm) do
    game_id = fsm.data.game_id
    users = FsmHelpers.get_users(fsm)
            |> Enum.map(fn(user) -> %{user.id => user} end)
    game_params = %{
      level: fsm.data.task.level,
      state: fsm.state
    }

    :ets.insert(:game_list, {game_key(game_id), users, game_params})
    :ok
  end

  def playing?(user_id) do
    :game_list |> :ets.match_object({:"$1", %{user_id => %{}}, :"_"}) |> List.empty? |> Kernel.!
  end

  defp game_key(game_id) when is_integer(game_id) do
    game_id
  end

  defp game_key(game_id) when is_binary(game_id) do
    game_id |> Integer.parse |> elem(0)
  end

  defp game_key(game_id) when is_list(game_id) do
    game_id |> to_string |> game_key
  end
end
