defmodule Codebattle.GameProcess.ActiveGames do
  @moduledoc """
    ActiveGames for game list
  """

  @table_name :active_games
  # {game_id, %{user_id => User, user_id => User}, %{level: "easy", state: :playing}}

  alias Codebattle.GameProcess.FsmHelpers

  def new do
    try do
      :ets.new(@table_name, [:ordered_set, :public, :named_table])
    rescue
      e in ArgumentError -> e
    end
  end

  def list_games do
    :ets.match_object(@table_name, :"_")
  end

  def create_game(user, fsm) do
    game_id = fsm.data.game_id
    users = %{user.id => user}
    game_params = %{
      level: fsm.data.task.level,
      state: fsm.state
    }

    :ets.insert(@table_name, {game_key(game_id), users, game_params})
  end

  def create_game(user, fsm) do
    case playing?(user.id) do
      true -> :error
      false ->
        game_id = fsm.data.game_id
        users = %{user.id => user}
        game_params = %{
          level: fsm.data.task.level,
          state: fsm.state
        }
        :ets.insert(@table_name, {game_key(game_id), users, game_params})
        :ok
    end
  end

  def add_participant(user, fsm) do
    game_id = fsm.data.game_id
    users = fsm
            |> FsmHelpers.get_users
            |> Enum.reduce(%{}, fn(user, acc) -> Map.put(acc, user.id, user) end)
    game_params = %{
      level: fsm.data.task.level,
      state: fsm.state
    }

    #TODO: maybe update instead of insert

    :ets.insert(@table_name, {game_key(game_id), users, game_params})
    :ok
  end

  def playing?(user_id) do
    @table_name |> :ets.match_object({:"_", %{user_id => %{}}, :"_"}) |> Enum.empty? |> Kernel.!
  end

  def participant?(game_id, user_id) do
    @table_name |> :ets.match_object({game_key(game_id), %{user_id => %{}}, :"_"}) |> Enum.empty? |> Kernel.!
  end

  def setup_game(fsm) do
    game_id = fsm.data.game_id
    users = fsm
            |> FsmHelpers.get_users
            |> Enum.reduce(%{}, fn(user, acc) -> Map.put(acc, user.id, user) end)
    game_params = %{
      level: fsm.data.task.level,
      state: fsm.state
    }

    :ets.insert(@table_name, {game_key(game_id), users, game_params})
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
