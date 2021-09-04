defmodule Codebattle.Tournament.Helpers do
  def get_players(tournament), do: tournament.data.players
  def get_matches(tournament), do: tournament.data.matches

  def players_count(tournament) do
    tournament |> get_players |> Enum.count()
  end

  def players_count(tournament, team_id) do
    tournament |> get_team_players(team_id) |> Enum.count()
  end

  def can_start_tournament?(tournament) do
    players_count(tournament) > 0 && tournament.state == "waiting_participants"
  end

  def is_waiting_partisipants?(tournament) do
    tournament.state == "waiting_participants"
  end

  def is_canceled?(tournament) do
    tournament.state == "canceled"
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

  def get_teams(%{meta: %{teams: teams}}),
    do: Enum.map(teams, fn x -> %{id: x.id, title: x.title} end)

  def get_teams(%{meta: %{"teams" => teams}}),
    do: Enum.map(teams, fn x -> %{id: x["id"], title: x["title"]} end)

  def get_teams(_), do: []

  def get_team_players(%{type: "team"} = tournament, team_id) do
    tournament |> get_players |> Enum.filter(&(&1.team_id == team_id))
  end

  def get_players_statistics(%{type: "team"} = tournament) do
    all_win_matches =
      tournament
      |> get_matches()
      |> Enum.filter(fn match ->
        is_finished?(match) and !is_anyone_gave_up?(match)
      end)

    unless Enum.empty?(all_win_matches) do
      tournament
      |> get_players()
      |> Enum.map(fn player ->
        team = tournament |> get_teams() |> get_team_by_id(player.team_id)
        win_matches = Enum.filter(all_win_matches, &is_winner?(&1, player))

        params = %{
          team: team.title,
          score: Enum.count(win_matches),
          average_time: get_average_time(win_matches)
        }

        player
        |> Map.from_struct()
        |> Map.merge(params)
      end)
      |> Enum.sort_by(&{-&1.score, &1.average_time})
    end
  end

  def get_tournament_statistics(%{type: "team"} = tournament) do
    all_win_matches =
      tournament
      |> get_matches()
      |> Enum.filter(fn match ->
        is_finished?(match) and !is_anyone_gave_up?(match)
      end)

    best_lang =
      all_win_matches
      |> Enum.map(fn match ->
        pick_winner(match).lang
      end)
      |> Enum.chunk_by(fn x -> x end)
      |> Enum.max_by(fn x -> Enum.count(x) end, fn -> [] end)
      |> Enum.at(0, "None")

    best_time =
      all_win_matches
      |> Enum.map(fn match -> match.duration end)
      |> Enum.min(fn -> [] end)

    %{
      best_lang: best_lang,
      best_time: best_time
    }
  end

  def get_tournament_statistics(_), do: %{}

  def pick_winner(%{players: [%{game_result: "won"} = winner, _]}), do: winner
  def pick_winner(%{players: [_, %{game_result: "won"} = winner]}), do: winner
  def pick_winner(%{players: [winner, %{game_result: "gave_up"}]}), do: winner
  def pick_winner(%{players: [%{game_result: "gave_up"}, winner]}), do: winner
  def pick_winner(match), do: Enum.random(match.players)

  def filter_statistics(statistics, "show"), do: statistics
  def filter_statistics(statistics, "hide"), do: [List.first(statistics)]

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

  defp is_finished?(%{state: "finished"}), do: true
  defp is_finished?(_match), do: false

  defp is_anyone_gave_up?(%{players: [%{game_result: "gave_up"}, _]}), do: true
  defp is_anyone_gave_up?(%{players: [_, %{game_result: "gave_up"}]}), do: true
  defp is_anyone_gave_up?(_), do: false

  defp is_winner?(%{players: players}, player) do
    Enum.any?(players, fn x -> x.id == player.id and x.game_result == "won" end)
  end

  defp get_average_time([]), do: 0

  defp get_average_time(matches) do
    div(Enum.reduce(matches, 0, fn x, acc -> acc + x.duration end), Enum.count(matches))
  end

  defp get_team_by_id(teams, team_id), do: Enum.find(teams, fn x -> x.id == team_id end)
end
