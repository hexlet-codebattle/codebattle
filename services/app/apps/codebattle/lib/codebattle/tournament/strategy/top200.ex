defmodule Codebattle.Tournament.Top200 do
  @moduledoc false
  use Codebattle.Tournament.Base

  alias Codebattle.Tournament
  alias Codebattle.Tournament.TournamentResult

  @impl Tournament.Base
  def complete_players(tournament) do
    # just for the UI test
    # users =
    #   Codebattle.User
    #   |> Codebattle.Repo.all()
    #   |> Enum.filter(&(&1.is_bot == false and &1.subscription_type != :admin))
    #   |> Enum.take(199)
    # add_players(tournament, %{users: users})

    tournament
  end

  @impl Tournament.Base
  def reset_meta(meta), do: meta

  @impl Tournament.Base
  def game_type, do: "duo"

  @impl Tournament.Base
  def calculate_round_results(%{current_round_position: 0} = tournament) do
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 0)
    players = get_players(tournament)

    main_draw_ids =
      ranking
      |> Map.values()
      |> Enum.sort_by(& &1.place)
      |> Enum.take(128)
      |> Enum.map(& &1.id)

    Enum.each(players, fn player ->
      Tournament.Players.put_player(tournament, %{
        player
        | draw_index: if(player.id in main_draw_ids, do: 1, else: 0),
          score: get_in(ranking, [player.id, :score]) || 0,
          place: get_in(ranking, [player.id, :place]) || 0
      })
    end)

    tournament
  end

  def calculate_round_results(%{current_round_position: 1} = tournament) do
    total_ranking = TournamentResult.get_user_ranking(tournament)
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 1)
    players = get_players(tournament)

    main_draw_ids = players |> Enum.filter(&(&1.draw_index > 0)) |> Enum.map(& &1.id)

    main_draw_ids =
      ranking
      |> Map.take(main_draw_ids)
      |> Map.values()
      |> Enum.sort_by(& &1.place)
      |> Enum.take(64)
      |> Enum.map(& &1.id)

    Enum.each(players, fn player ->
      Tournament.Players.put_player(tournament, %{
        player
        | draw_index: if(player.id in main_draw_ids, do: 1, else: 0),
          score: get_in(total_ranking, [player.id, :score]) || 0,
          place: get_in(total_ranking, [player.id, :place]) || 0
      })
    end)

    tournament
  end

  def calculate_round_results(%{current_round_position: 2} = tournament) do
    total_ranking = TournamentResult.get_user_ranking(tournament)
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 2)
    players = get_players(tournament)

    main_draw_ids = players |> Enum.filter(&(&1.draw_index > 0)) |> Enum.map(& &1.id)

    main_draw_ids =
      ranking
      |> Map.take(main_draw_ids)
      |> Map.values()
      |> Enum.sort_by(& &1.place)
      |> Enum.take(32)
      |> Enum.map(& &1.id)

    Enum.each(players, fn player ->
      Tournament.Players.put_player(tournament, %{
        player
        | draw_index: if(player.id in main_draw_ids, do: 1, else: 0),
          score: get_in(total_ranking, [player.id, :score]) || 0,
          place: get_in(total_ranking, [player.id, :place]) || 0
      })
    end)

    tournament
  end

  def calculate_round_results(%{current_round_position: 3} = tournament) do
    total_ranking = TournamentResult.get_user_ranking(tournament)
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 3)
    players = get_players(tournament)

    main_draw_ids = players |> Enum.filter(&(&1.draw_index > 0)) |> Enum.map(& &1.id)

    main_draw_ids =
      ranking
      |> Map.take(main_draw_ids)
      |> Map.values()
      |> Enum.sort_by(& &1.place)
      |> Enum.take(6)
      |> Enum.map(& &1.id)

    underdog_ids =
      total_ranking
      |> Map.values()
      |> Enum.reject(&(&1.id in main_draw_ids))
      |> Enum.sort_by(& &1.place)
      |> Enum.take(2)
      |> Enum.map(& &1.id)

    main_draw_ids = underdog_ids ++ main_draw_ids

    Enum.each(players, fn player ->
      Tournament.Players.put_player(tournament, %{
        player
        | draw_index: if(player.id in main_draw_ids, do: 1, else: 0),
          returned: player.id in underdog_ids,
          score: get_in(total_ranking, [player.id, :score]) || 0,
          place: get_in(total_ranking, [player.id, :place]) || 0
      })
    end)

    tournament
  end

  def calculate_round_results(%{current_round_position: 4} = tournament) do
    total_ranking = TournamentResult.get_user_ranking(tournament)
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 4)
    players = get_players(tournament)
    main_draw_ids = players |> Enum.filter(&(&1.draw_index == 1)) |> Enum.map(& &1.id)

    {top_1_2_3_4_ids, top_5_6_7_8_ids} =
      tournament
      |> get_round_matches(4)
      |> Enum.filter(fn match ->
        Enum.any?(match.player_ids, fn id -> id in main_draw_ids end)
      end)
      |> Enum.map(& &1.player_ids)
      |> Enum.uniq()
      |> Enum.map(fn [p1_id, p2_id] ->
        if get_in(ranking, [p1_id, :place]) <= get_in(ranking, [p2_id, :place]) do
          {p1_id, p2_id}
        else
          {p2_id, p1_id}
        end
      end)
      |> Enum.unzip()

    Enum.each(players, fn player ->
      Tournament.Players.put_player(tournament, %{
        player
        | draw_index:
            cond do
              player.id in top_1_2_3_4_ids -> 2
              player.id in top_5_6_7_8_ids -> 1
              true -> player.draw_index
            end,
          returned: false,
          score: get_in(total_ranking, [player.id, :score]) || 0,
          place: get_in(total_ranking, [player.id, :place]) || 0
      })
    end)

    tournament
  end

  def calculate_round_results(%{current_round_position: 5} = tournament) do
    total_ranking = TournamentResult.get_user_ranking(tournament)
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 5)
    players = get_players(tournament)
    top_1_2_3_4_ids = for player <- players, player.draw_index == 2, do: player.id
    top_5_6_7_8_ids = for player <- players, player.draw_index == 1, do: player.id

    round_matches = get_round_matches(tournament, 5)

    {top_1_2_ids, top_3_4_ids} =
      round_matches
      |> Enum.filter(fn match ->
        Enum.any?(match.player_ids, fn id -> id in top_1_2_3_4_ids end)
      end)
      |> Enum.map(& &1.player_ids)
      |> Enum.uniq()
      |> Enum.map(fn [p1_id, p2_id] ->
        if get_in(ranking, [p1_id, :place]) <= get_in(ranking, [p2_id, :place]) do
          {p1_id, p2_id}
        else
          {p2_id, p1_id}
        end
      end)
      |> Enum.unzip()

    {top_5_6_ids, top_7_8_ids} =
      round_matches
      |> Enum.filter(fn match ->
        Enum.any?(match.player_ids, fn id -> id in top_5_6_7_8_ids end)
      end)
      |> Enum.map(& &1.player_ids)
      |> Enum.uniq()
      |> Enum.map(fn [p1_id, p2_id] ->
        if get_in(ranking, [p1_id, :place]) <= get_in(ranking, [p2_id, :place]) do
          {p1_id, p2_id}
        else
          {p2_id, p1_id}
        end
      end)
      |> Enum.unzip()

    Enum.each(players, fn player ->
      Tournament.Players.put_player(tournament, %{
        player
        | draw_index:
            cond do
              player.id in top_1_2_ids -> 4
              player.id in top_3_4_ids -> 3
              player.id in top_5_6_ids -> 2
              player.id in top_7_8_ids -> 1
              true -> 0
            end,
          score: get_in(total_ranking, [player.id, :score]) || 0,
          place: get_in(total_ranking, [player.id, :place]) || 0
      })
    end)

    tournament
  end

  def calculate_round_results(%{current_round_position: 6} = tournament) do
    total_ranking = TournamentResult.get_user_ranking(tournament)
    ranking = TournamentResult.get_user_ranking_for_round(tournament, 6)
    players = get_players(tournament)

    [p1_id, p2_id] = for player <- players, player.draw_index == 4, do: player.id
    [p3_id, p4_id] = for player <- players, player.draw_index == 3, do: player.id
    [p5_id, p6_id] = for player <- players, player.draw_index == 2, do: player.id
    [p7_id, p8_id] = for player <- players, player.draw_index == 1, do: player.id

    {top1_id, top2_id} =
      if get_in(ranking, [p1_id, :place]) <= get_in(ranking, [p2_id, :place]) do
        {p1_id, p2_id}
      else
        {p2_id, p1_id}
      end

    {top3_id, top4_id} =
      if get_in(ranking, [p3_id, :place]) <= get_in(ranking, [p4_id, :place]) do
        {p3_id, p4_id}
      else
        {p4_id, p3_id}
      end

    {top5_id, top6_id} =
      if get_in(ranking, [p5_id, :place]) <= get_in(ranking, [p6_id, :place]) do
        {p5_id, p6_id}
      else
        {p6_id, p5_id}
      end

    {top7_id, top8_id} =
      if get_in(ranking, [p7_id, :place]) <= get_in(ranking, [p8_id, :place]) do
        {p7_id, p8_id}
      else
        {p8_id, p7_id}
      end

    Enum.each(players, fn player ->
      Tournament.Players.put_player(tournament, %{
        player
        | draw_index:
            cond do
              player.id == top1_id -> 8
              player.id == top2_id -> 7
              player.id == top3_id -> 6
              player.id == top4_id -> 5
              player.id == top5_id -> 4
              player.id == top6_id -> 3
              player.id == top7_id -> 2
              player.id == top8_id -> 1
              true -> player.draw_index
            end,
          score: get_in(total_ranking, [player.id, :score]) || 0,
          place: get_in(total_ranking, [player.id, :place]) || 0
      })
    end)

    %{tournament | winner_ids: [top1_id, top2_id, top3_id, top4_id, top5_id, top6_id, top7_id, top8_id]}
  end

  @impl Tournament.Base
  def build_round_pairs(%{current_round_position: 0} = tournament) do
    player_pairs = tournament |> get_players() |> Enum.shuffle() |> Enum.chunk_every(2)

    {tournament, player_pairs}
  end

  # for main draw build 128, 64, 32 players into pairs with top 8 by round seeded
  # rest shuffled
  def build_round_pairs(%{current_round_position: round_position} = tournament) when round_position in [1, 2, 3] do
    players = get_players(tournament)

    {main_draw_players, consolation_draw_players} = Enum.split_with(players, &(&1.draw_index > 0))

    {seeded, unseeded} = main_draw_players |> Enum.sort_by(& &1.place) |> Enum.split(8)

    {unseeded_for_seeded, rest_unseeded} = unseeded |> Enum.shuffle() |> Enum.split(8)

    seeded_pairs =
      seeded
      |> Enum.zip(unseeded_for_seeded)
      |> Enum.map(fn {p1, p2} -> [p1, p2] end)

    unseeded_pairs = Enum.chunk_every(rest_unseeded, 2)

    consolation_pairs =
      consolation_draw_players
      |> Enum.shuffle()
      |> Enum.chunk_every(2)

    {tournament, seeded_pairs ++ unseeded_pairs ++ consolation_pairs}
  end

  # for top 8 build random pairs
  # rest shuffled
  def build_round_pairs(%{current_round_position: round_position} = tournament) when round_position in [4, 5, 6] do
    players = get_players(tournament)

    pairs =
      players
      |> Enum.group_by(& &1.draw_index)
      |> Map.values()
      |> Enum.flat_map(fn draw_players ->
        draw_players
        |> Enum.shuffle()
        |> Enum.chunk_every(2)
      end)

    {tournament, pairs}
  end

  @impl Tournament.Base
  def finish_tournament?(tournament) do
    tournament.meta.rounds_limit - 1 == tournament.current_round_position
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

  @impl Tournament.Base
  def finish_round_after_match?(
        %{
          task_provider: "task_pack_per_round",
          round_task_ids: round_task_ids,
          current_round_position: current_round_position
        } = tournament
      ) do
    matches = get_round_matches(tournament, current_round_position)

    task_index = round(2 * Enum.count(matches) / players_count(tournament))

    !Enum.any?(matches, &(&1.state == "playing")) and
      task_index == Enum.count(round_task_ids)
  end

  @impl Tournament.Base
  def set_ranking(tournament) do
    Tournament.Ranking.set_ranking(tournament)
  end

  defp get_wait_type(tournament, game_params) do
    # min_seconds_to_rematch = 7 + round(timeout_ms / 1000)

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

  defp has_more_games_in_round?(%{task_provider: "task_pack_per_round", round_task_ids: round_task_ids}, game_params) do
    game_params.task_id != List.last(round_task_ids)
  end

  defp has_more_games_in_round?(_tournament, _game_params), do: false
end
