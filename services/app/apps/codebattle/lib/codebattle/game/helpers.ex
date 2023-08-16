defmodule Codebattle.Game.Helpers do
  @moduledoc false

  def get_state(game), do: game.state
  def get_game_id(game), do: game.id
  def get_tournament_id(game), do: game.tournament_id
  def get_inserted_at(game), do: game.inserted_at
  def get_starts_at(game), do: game.starts_at
  def get_timeout_seconds(game), do: game.timeout_seconds
  def get_type(game), do: game.type
  def get_visibility_type(game), do: game.visibility_type
  def get_level(game), do: game.level
  def get_rematch_state(game), do: game.rematch_state
  def get_rematch_initiator_id(game), do: game.rematch_initiator_id
  def get_players(game), do: game.players
  def get_task(game), do: game.task
  def get_bots(game), do: game |> get_players |> Enum.filter(fn player -> player.is_bot end)
  def get_first_player(game), do: game |> get_players |> Enum.at(0)
  def get_second_player(game), do: game |> get_players |> Enum.at(1)

  def get_first_non_bot(game),
    do: game |> get_players |> Enum.find(fn player -> !player.is_bot end)

  def bot_game?(game), do: game |> get_players |> Enum.any?(fn p -> p.is_bot end)
  def tournament_game?(game), do: get_tournament_id(game) != nil
  def training_game?(game), do: game.mode == "training"
  def active_game?(game), do: game.is_live && game.state in ["waiting_opponent", "playing"]

  def get_winner(game) do
    game
    |> get_players
    |> Enum.find(fn player -> player.result == "won" end)
  end

  def get_player(game, id) do
    game
    |> get_players
    |> Enum.find(fn player -> player.id == id end)
  end

  def is_player?(game, player_id) do
    game
    |> get_players
    |> Enum.any?(&(&1.id == player_id))
  end

  def get_opponent(game, player_id) do
    game
    |> get_players
    |> Enum.find(&(&1.id != player_id))
  end

  def get_player_results(game) do
    game
    |> get_players
    |> Enum.map(&{&1.id, Map.take(&1, [:id, :result, :duration_sec, :result_percent])})
    |> Enum.into(%{})
  end

  def winner?(game, player_id), do: is_player_result?(game, player_id, "won")

  def lost?(game, player_id), do: is_player_result?(game, player_id, "lost")
  def gave_up?(game, player_id), do: is_player_result?(game, player_id, "gave_up")

  def update_player(game, player_id, params) do
    new_players =
      Enum.map(game.players, fn player ->
        case player.id == player_id do
          true -> Map.merge(player, params)
          _ -> player
        end
      end)

    %{game | players: new_players}
  end

  def update_other_players(game, player_id, params) do
    new_players =
      Enum.map(game.players, fn player ->
        case player.id != player_id do
          true -> Map.merge(player, params)
          _ -> player
        end
      end)

    %{game | players: new_players}
  end

  def maybe_set_best_results(game, player_id, params) do
    new_players =
      Enum.map(game.players, fn player ->
        case player.id == player_id and player.result_percent < params.result_percent do
          true -> Map.merge(player, params)
          _ -> player
        end
      end)

    %{game | players: new_players}
  end

  def mark_as_live(game), do: Map.put(game, :is_live, true)

  def fill_virtual_fields(game) do
    %{
      game
      | is_bot: bot_game?(game),
        is_tournament: tournament_game?(game)
    }
  end

  defp is_player_result?(game, player_id, result) do
    game
    |> get_players
    |> Enum.find_value(fn p -> p.id == player_id && p.result == result end)
    |> Kernel.!()
    |> Kernel.!()
  end
end
