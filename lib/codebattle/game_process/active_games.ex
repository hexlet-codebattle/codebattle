defmodule Codebattle.GameProcess.ActiveGames do
  @moduledoc """
    ActiveGames for game list
  """
  alias Codebattle.GameProcess.FsmHelpers

  def new do
    :ets.new(:game_list, [:ordered_set, :public, :named_table])
  end

  def list_games do
    :ets.match_object(:game_list, :"_")
  end

  def create_game(user, fsm) do
    # {game_id, %{user_id => {}, user_id => {}}, game_params}
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
    case playing?(user.id) do
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

  def add_participant(user, fsm) do
    game_id = fsm.data.game_id
    users = fsm
            |> FsmHelpers.get_users
            |> Enum.map(fn(user) -> %{user.id => user} end)
    game_params = %{
      level: fsm.data.task.level,
      state: fsm.state
    }

    #TODO: maybe update instead of insert

    :ets.insert(:game_list, {game_key(game_id), users, game_params})
    :ok
  end

  def playing?(user_id) do
    :game_list |> :ets.match_object({:"_", %{user_id => %{}}, :"_"}) |> Enum.empty? |> Kernel.!
  end

  def participant?(game_id, user_id) do
    :game_list |> :ets.match_object({game_key(game_id), %{user_id => %{}}, :"_"}) |> Enum.empty? |> Kernel.!
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
