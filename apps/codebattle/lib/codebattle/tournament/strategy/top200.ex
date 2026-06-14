defmodule Codebattle.Tournament.Top200 do
  @moduledoc false
  use Codebattle.Tournament.Base

  alias Codebattle.Tournament
  alias Codebattle.Tournament.TournamentResult

  @impl Tournament.Base
  def complete_players(tournament) do
    # just for the UI test
    users =
      Codebattle.User
      |> Codebattle.Repo.all()
      |> Enum.filter(&(&1.is_bot == false and &1.subscription_type != :admin))
      |> Enum.take(199)

    add_players(tournament, %{users: users})
  end

  @impl Tournament.Base
  def reset_meta(meta), do: meta

  @impl Tournament.Base
  def game_type, do: "duo"

  @impl Tournament.Base
  def calculate_round_results(tournament), do: tournament

  # R0 — accelerated Swiss:
  #   топ-8 по рейтингу — бракет #1v#8, #4v#5, #3v#6, #2v#7
  #   остальные 192 — пары соседей по рейтингу #9v#10, #11v#12, ...
  @impl Tournament.Base
  def build_round_pairs(%{current_round_position: 0} = tournament) do
    sorted = sort_by_rating(get_players(tournament))
    {top_8, rest} = Enum.split(sorted, 8)

    top_pairs = standard_bracket_qf(top_8)
    rest_pairs = Enum.chunk_every(rest, 2)

    {tournament, top_pairs ++ rest_pairs}
  end

  # R1-R4 — Dutch Swiss:
  #   сортируем по сумме очков (desc), пэйрим соседей с обходом повторов
  def build_round_pairs(%{current_round_position: pos} = tournament) when pos in 1..4 do
    ranking = TournamentResult.get_user_ranking(tournament)
    players = get_players(tournament)
    played = played_opponents(tournament, Enum.map(players, & &1.id))

    sorted = sort_by_ranking(players, ranking)
    {tournament, swiss_pair(sorted, played)}
  end

  # R5 — Quarterfinal: топ-8 по сумме очков, бракет #1v#8, #4v#5, #3v#6, #2v#7
  def build_round_pairs(%{current_round_position: 5} = tournament) do
    ranking = TournamentResult.get_user_ranking(tournament)

    top_8 =
      tournament
      |> get_players()
      |> sort_by_ranking(ranking)
      |> Enum.take(8)

    {tournament, standard_bracket_qf(top_8)}
  end

  # R6 — Semifinal:
  #   победители QF → главная сетка (играют за 1-4 места)
  #   проигравшие QF → утешительная сетка (играют за 5-8 места)
  def build_round_pairs(%{current_round_position: 6} = tournament) do
    qf_results = TournamentResult.get_user_ranking_for_round(tournament, 5)
    players_by_id = id_map(get_players(tournament))

    [qf1, qf2, qf3, qf4] =
      tournament
      |> get_round_matches(5)
      |> Enum.sort_by(& &1.id)
      |> Enum.map(& &1.player_ids)

    {qf1_w, qf1_l} = winner_loser(qf1, qf_results)
    {qf2_w, qf2_l} = winner_loser(qf2, qf_results)
    {qf3_w, qf3_l} = winner_loser(qf3, qf_results)
    {qf4_w, qf4_l} = winner_loser(qf4, qf_results)

    pairs = [
      # SF1 — верхняя половина сетки за 1-4
      [players_by_id[qf1_w], players_by_id[qf2_w]],
      # SF2 — нижняя половина сетки за 1-4
      [players_by_id[qf3_w], players_by_id[qf4_w]],
      # Cons SF1 — верхняя половина за 5-8
      [players_by_id[qf1_l], players_by_id[qf2_l]],
      # Cons SF2 — нижняя половина за 5-8
      [players_by_id[qf3_l], players_by_id[qf4_l]]
    ]

    {tournament, pairs}
  end

  # R7 — Finals: 4 параллельных матча за 1/2, 3/4, 5/6, 7/8
  def build_round_pairs(%{current_round_position: 7} = tournament) do
    sf_results = TournamentResult.get_user_ranking_for_round(tournament, 6)
    players_by_id = id_map(get_players(tournament))

    [sf_main_top, sf_main_bot, sf_cons_top, sf_cons_bot] =
      tournament
      |> get_round_matches(6)
      |> Enum.sort_by(& &1.id)
      |> Enum.map(& &1.player_ids)

    {mt_w, mt_l} = winner_loser(sf_main_top, sf_results)
    {mb_w, mb_l} = winner_loser(sf_main_bot, sf_results)
    {ct_w, ct_l} = winner_loser(sf_cons_top, sf_results)
    {cb_w, cb_l} = winner_loser(sf_cons_bot, sf_results)

    pairs = [
      # За 1-2
      [players_by_id[mt_w], players_by_id[mb_w]],
      # За 3-4
      [players_by_id[mt_l], players_by_id[mb_l]],
      # За 5-6
      [players_by_id[ct_w], players_by_id[cb_w]],
      # За 7-8
      [players_by_id[ct_l], players_by_id[cb_l]]
    ]

    {tournament, pairs}
  end

  @impl Tournament.Base
  def finish_tournament?(tournament) do
    tournament.rounds_limit - 1 == tournament.current_round_position
  end

  @impl Tournament.Base
  def maybe_create_rematch(tournament, game_params) do
    timeout_ms = Application.get_env(:codebattle, :tournament_rematch_timeout_ms)
    wait_type = get_wait_type(tournament, game_params)

    if wait_type == "rematch" do
      Process.send_after(
        self(),
        {:start_rematch, game_params.ref, tournament.current_round_position},
        timeout_ms
      )
    end

    Codebattle.PubSub.broadcast("tournament:game:wait", %{
      game_id: game_params.game_id,
      type: wait_type
    })

    tournament
  end

  # Раунд завершается только когда все пары отыграли по 2 игры (или таймер раунда истёк).
  @impl Tournament.Base
  def finish_round_after_match?(tournament) do
    matches = get_round_matches(tournament, tournament.current_round_position)
    pair_counts = Enum.frequencies_by(matches, &Enum.sort(&1.player_ids))

    Enum.all?(matches, &(&1.state != "playing")) and
      Enum.all?(pair_counts, fn {_pair, count} -> count >= 2 end)
  end

  def maybe_finish_round_after_finish_match(tournament) do
    if finish_round_after_match?(tournament) do
      finish_round_and_next_step(tournament)
    else
      tournament
    end
  end

  # ---- helpers ----

  defp sort_by_rating(players) do
    Enum.sort_by(players, fn p -> {-(p.rating || 0), p.id} end)
  end

  defp sort_by_ranking(players, ranking) do
    Enum.sort_by(players, fn p ->
      r = ranking[p.id]
      {-score_value(r && r.score), (r && r.place) || 999_999, p.id}
    end)
  end

  # Стандартная теннисная сетка топ-8 (порядок соответствует сетке сверху вниз).
  # SF строится так: QF1∪QF2 → SF1 (верхняя половина), QF3∪QF4 → SF2 (нижняя).
  defp standard_bracket_qf([s1, s2, s3, s4, s5, s6, s7, s8]) do
    [
      [s1, s8],
      [s4, s5],
      [s3, s6],
      [s2, s7]
    ]
  end

  defp played_opponents(tournament, user_ids) do
    tournament
    |> TournamentResult.get_users_history(user_ids)
    |> Enum.reduce(%{}, fn {user_id, history}, acc ->
      opponents = MapSet.new(history, & &1.opponent_id)
      Map.put(acc, user_id, opponents)
    end)
  end

  defp swiss_pair(players, played), do: do_swiss_pair(players, played, [])

  defp do_swiss_pair([], _played, acc), do: Enum.reverse(acc)
  defp do_swiss_pair([_solo], _played, acc), do: Enum.reverse(acc)

  defp do_swiss_pair([p1 | rest], played, acc) do
    case find_unplayed(p1, rest, played) do
      {opp, remaining} ->
        do_swiss_pair(remaining, played, [[p1, opp] | acc])

      nil ->
        [p2 | rest_after] = rest
        do_swiss_pair(rest_after, played, [[p1, p2] | acc])
    end
  end

  defp find_unplayed(_p1, [], _played), do: nil

  defp find_unplayed(p1, [candidate | rest], played) do
    opponents = Map.get(played, p1.id, MapSet.new())

    if MapSet.member?(opponents, candidate.id) do
      case find_unplayed(p1, rest, played) do
        {opp, remaining} -> {opp, [candidate | remaining]}
        nil -> nil
      end
    else
      {candidate, rest}
    end
  end

  defp winner_loser([p1_id, p2_id], results) do
    s1 = score_value(get_in(results, [p1_id, :score]))
    s2 = score_value(get_in(results, [p2_id, :score]))
    if s1 >= s2, do: {p1_id, p2_id}, else: {p2_id, p1_id}
  end

  defp id_map(players), do: Map.new(players, &{&1.id, &1})

  defp score_value(nil), do: 0
  defp score_value(%Decimal{} = d), do: Decimal.to_float(d)
  defp score_value(n) when is_number(n), do: n
  defp score_value(_), do: 0

  defp get_wait_type(tournament, game_params) do
    if has_more_games_in_round?(tournament, game_params) do
      "rematch"
    else
      if finish_tournament?(tournament) do
        "tournament"
      else
        "round"
      end
    end
  end

  # У каждой пары в раунде должно быть ровно 2 игры. После первой → ремач со второй задачей.
  defp has_more_games_in_round?(tournament, game_params) do
    case get_match(tournament, game_params.ref) do
      nil ->
        false

      %{player_ids: player_ids} ->
        pair = Enum.sort(player_ids)
        round = tournament.current_round_position

        games_played =
          tournament
          |> get_round_matches(round)
          |> Enum.count(&(Enum.sort(&1.player_ids) == pair))

        games_played < 2
    end
  end
end
