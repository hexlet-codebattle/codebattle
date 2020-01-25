defmodule Codebattle.Tournament.Helpers do
  def get_players(tournament), do: tournament.data.players
  def get_matches(tournament), do: tournament.data.matches

  def get_module(%{type: "team"}), do: Codebattle.Tournament.Team
  def get_module(_), do: Codebattle.Tournament.Individual

  def players_count(tournament) do
    tournament |> get_players |> Enum.count()
  end

  def players_count(tournament, team_id) do
    tournament |> get_team_players(team_id) |> Enum.count()
  end

  def is_waiting_partisipants?(tournament) do
    tournament.state == "waiting_participants"
  end

  def is_participant?(tournament, player_id) do
    tournament.data.players
    |> Enum.find_value(fn player -> player.id == player_id end)
    |> Kernel.!()
    |> Kernel.!()
  end

  def is_participant?(tournament, player_id, team_id) do
    tournament.data.players
    |> Enum.find_value(fn p -> p.id == player_id and p.team_id == team_id end)
    |> Kernel.!()
    |> Kernel.!()
  end

  def is_creator?(tournament, player_id) do
    tournament.creator_id == player_id
  end

  def calc_round_result(round) do
    round
    |> Enum.map(&calc_match_result/1)
    |> Enum.reduce(fn {x1, x2}, {a1, a2} -> {x1 + a1, x2 + a2} end)
  end

  def get_round_id([%{round_id: round_id} | _]), do: round_id

  def get_rounds(tournament) do
    tournament
    |> get_matches()
    |> Enum.chunk_by(& &1.round_id)
    |> Enum.sort_by(&get_round_id/1)
  end

  def get_teams(%{meta: meta}), do: meta["teams"]

  def get_team_players(%{type: "team"} = tournament, team_id) do
    tournament |> get_players |> Enum.filter(&(&1.team_id == team_id))
  end

  def calc_team_score(tournament) do
    tournament
    |> get_rounds()
    |> Enum.filter(fn round -> Enum.all?(round, &(&1.state in ["canceled", "finished"])) end)
    |> Enum.map(&calc_round_result/1)
    |> Enum.reduce({0, 0}, fn {x1, x2}, {a1, a2} ->
      cond do
        x1 > x2 -> {a1 + 1, a2}
        x1 < x2 -> {a1, a2 + 1}
        true -> {a1 + 0.5, a2 + 0.5}
      end
    end)
  end

  defp calc_match_result(%{players: [%{game_result: "won"}, _]}), do: {1, 0}
  defp calc_match_result(%{players: [_, %{game_result: "won"}]}), do: {0, 1}
  defp calc_match_result(%{players: [_, %{game_result: "gave_up"}]}), do: {1, 0}
  defp calc_match_result(%{players: [%{game_result: "gave_up"}, _]}), do: {0, 1}
  defp calc_match_result(_), do: {0, 0}
end
