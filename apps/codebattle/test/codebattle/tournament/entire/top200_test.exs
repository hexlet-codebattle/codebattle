defmodule Codebattle.Tournament.Entire.Top200Test do
  use Codebattle.DataCase, async: false

  alias Codebattle.PubSub.Message
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.Match
  alias Codebattle.Tournament.Player
  alias Codebattle.Tournament.Top200

  describe "build_round_pairs/1 — R0 accelerated Swiss" do
    test "200 players → 100 pairs covering everyone" do
      tournament = build_inline_tournament(0, players_with_ratings(1..200))

      {_, pairs} = Top200.build_round_pairs(tournament)

      assert length(pairs) == 100
      all_ids = pairs |> List.flatten() |> Enum.map(& &1.id) |> Enum.uniq()
      assert length(all_ids) == 200
    end

    test "top 8 by rating play in tennis bracket #1v#8, #4v#5, #3v#6, #2v#7" do
      tournament = build_inline_tournament(0, players_with_ratings(1..200))

      {_, pairs} = Top200.build_round_pairs(tournament)

      assert pair_ids(Enum.take(pairs, 4)) == [
               # #1 vs #8
               [193, 200],
               # #4 vs #5
               [196, 197],
               # #3 vs #6
               [195, 198],
               # #2 vs #7
               [194, 199]
             ]
    end

    test "players 9-200 paired by adjacent rating" do
      tournament = build_inline_tournament(0, players_with_ratings(1..200))

      {_, pairs} = Top200.build_round_pairs(tournament)

      rest_pairs = Enum.drop(pairs, 4)
      assert length(rest_pairs) == 96

      # отсортированы по рейтингу: 192, 191, ..., 1 → пары соседей
      assert rest_pairs |> pair_ids() |> hd() == [191, 192]
      assert rest_pairs |> pair_ids() |> List.last() == [1, 2]
    end
  end

  describe "build_round_pairs/1 — R1 Dutch Swiss" do
    test "200 игроков → 100 пар, сортировка по сумме очков" do
      tournament = insert_top200_tournament()
      record_scores(tournament.id, 0, Enum.map(1..200, fn id -> {id, 200 - id} end))

      tournament = put_inline(tournament, 1, players_with_ratings(1..200), %{})
      {_, pairs} = Top200.build_round_pairs(tournament)

      assert length(pairs) == 100

      # лидер таблицы — user 1 (score 199), сосед по таблице — user 2 (score 198)
      first_pair = pairs |> hd() |> pair_to_sorted_ids()
      assert first_pair == [1, 2]
    end

    test "избегает реванш если можно" do
      tournament = insert_top200_tournament()

      # 4 игрока, у user 1 высший балл, дальше по убыванию
      record_scores(tournament.id, 0, [{1, 100}, {2, 90}, {3, 80}, {4, 70}])
      # При этом 1 уже играл с 2, 3 с 4 (то есть game_id связь)
      record_played_game(tournament.id, 0, {1, 50}, {2, 40})
      record_played_game(tournament.id, 0, {3, 30}, {4, 20})

      tournament = put_inline(tournament, 1, players_with_ratings(1..4), %{})
      {_, pairs} = Top200.build_round_pairs(tournament)

      # Лучший вариант без повторов: [1, 3] и [2, 4]
      assert pair_ids(pairs) == [[1, 3], [2, 4]]
    end
  end

  describe "build_round_pairs/1 — R5 quarterfinal" do
    test "топ-8 по сумме очков → теннисный бракет #1v#8, #4v#5, #3v#6, #2v#7" do
      tournament = insert_top200_tournament()

      # user 1 — лучший, user 200 — худший
      record_scores(tournament.id, 0, Enum.map(1..200, fn id -> {id, 1000 - id} end))

      tournament = put_inline(tournament, 5, players_with_ratings(1..200), %{})
      {_, pairs} = Top200.build_round_pairs(tournament)

      assert length(pairs) == 4

      assert pair_ids(pairs) == [
               # #1 vs #8
               [1, 8],
               # #4 vs #5
               [4, 5],
               # #3 vs #6
               [3, 6],
               # #2 vs #7
               [2, 7]
             ]
    end
  end

  describe "build_round_pairs/1 — R6 semifinal" do
    test "победители QF в главной сетке, проигравшие в утешительной за 5-8" do
      tournament = insert_top200_tournament()

      # QF (R5) матчи: [1,8], [4,5], [3,6], [2,7]
      # Победители: 1, 4, 3, 2 (нечётные позиции в исходной паре)
      # Проигравшие: 8, 5, 6, 7
      qf_matches =
        inline_matches([
          %Match{id: 1, player_ids: [1, 8], round_position: 5, state: "game_over"},
          %Match{id: 2, player_ids: [4, 5], round_position: 5, state: "game_over"},
          %Match{id: 3, player_ids: [3, 6], round_position: 5, state: "game_over"},
          %Match{id: 4, player_ids: [2, 7], round_position: 5, state: "game_over"}
        ])

      record_scores(tournament.id, 5, [
        {1, 100},
        {8, 50},
        {4, 100},
        {5, 50},
        {3, 100},
        {6, 50},
        {2, 100},
        {7, 50}
      ])

      tournament = put_inline(tournament, 6, players_with_ratings(1..8), qf_matches)
      {_, pairs} = Top200.build_round_pairs(tournament)

      assert pair_ids(pairs) == [
               # SF1 — главная сетка, верхняя половина
               [1, 4],
               # SF2 — главная сетка, нижняя половина
               [2, 3],
               # Cons SF1 — за 5-8, верхняя половина
               [5, 8],
               # Cons SF2 — за 5-8, нижняя половина
               [6, 7]
             ]
    end
  end

  describe "maybe_create_rematch/2" do
    test "после первой игры пары планирует :start_rematch и broadcast'ит wait_type=rematch" do
      matches =
        inline_matches([
          %Match{id: 1, game_id: 100, player_ids: [1, 2], round_position: 0, state: "game_over"}
        ])

      tournament =
        0
        |> build_inline_tournament(players_with_ratings(1..2))
        |> Map.merge(%{matches: matches, rounds_limit: 8})

      Codebattle.PubSub.subscribe("game:100")

      Top200.maybe_create_rematch(tournament, %{ref: 1, game_id: 100})

      assert_receive {:start_rematch, 1, 0}

      assert_receive %Message{
        topic: "game:100",
        event: "tournament:game:wait",
        payload: %{type: "rematch"}
      }
    end

    test "после второй игры пары НЕ планирует ремач и broadcast'ит wait_type=round" do
      matches =
        inline_matches([
          %Match{id: 1, game_id: 100, player_ids: [1, 2], round_position: 0, state: "game_over"},
          %Match{id: 2, game_id: 101, player_ids: [1, 2], round_position: 0, state: "game_over"}
        ])

      tournament =
        0
        |> build_inline_tournament(players_with_ratings(1..2))
        |> Map.merge(%{matches: matches, rounds_limit: 8})

      Codebattle.PubSub.subscribe("game:101")

      Top200.maybe_create_rematch(tournament, %{ref: 2, game_id: 101})

      assert_receive %Message{
        topic: "game:101",
        event: "tournament:game:wait",
        payload: %{type: "round"}
      }

      refute_received {:start_rematch, _, _}
    end

    test ":start_rematch тагается с current_round_position (для Server-проверки на устаревшие сообщения)" do
      matches =
        inline_matches([
          %Match{id: 42, game_id: 999, player_ids: [1, 2], round_position: 3, state: "game_over"}
        ])

      tournament =
        3
        |> build_inline_tournament(players_with_ratings(1..2))
        |> Map.merge(%{matches: matches, rounds_limit: 8})

      Codebattle.PubSub.subscribe("game:999")

      Top200.maybe_create_rematch(tournament, %{ref: 42, game_id: 999})

      # round_position == 3 в сообщении — Server по нему отсечёт stale rematch
      # если current_round_position уже сменился
      assert_receive {:start_rematch, 42, 3}
    end

    test "защита от двойного шедулинга: если у пары уже есть playing-ремач, не планируется новый" do
      # 1 game_over + 1 playing (ремач уже в процессе) — has_more_games_in_round? даёт false
      matches =
        inline_matches([
          %Match{id: 1, game_id: 100, player_ids: [1, 2], round_position: 0, state: "game_over"},
          %Match{id: 2, game_id: 101, player_ids: [1, 2], round_position: 0, state: "playing"}
        ])

      tournament =
        0
        |> build_inline_tournament(players_with_ratings(1..2))
        |> Map.merge(%{matches: matches, rounds_limit: 8})

      Codebattle.PubSub.subscribe("game:100")

      Top200.maybe_create_rematch(tournament, %{ref: 1, game_id: 100})

      assert_receive %Message{
        topic: "game:100",
        event: "tournament:game:wait",
        payload: %{type: "round"}
      }

      refute_received {:start_rematch, _, _}
    end

    test "после второй игры последнего раунда wait_type=tournament" do
      matches =
        inline_matches([
          %Match{id: 1, game_id: 100, player_ids: [1, 2], round_position: 7, state: "game_over"},
          %Match{id: 2, game_id: 101, player_ids: [1, 2], round_position: 7, state: "game_over"}
        ])

      tournament =
        7
        |> build_inline_tournament(players_with_ratings(1..2))
        |> Map.merge(%{matches: matches, rounds_limit: 8})

      Codebattle.PubSub.subscribe("game:101")

      Top200.maybe_create_rematch(tournament, %{ref: 2, game_id: 101})

      assert_receive %Message{
        topic: "game:101",
        event: "tournament:game:wait",
        payload: %{type: "tournament"}
      }

      refute_received {:start_rematch, _, _}
    end
  end

  describe "finish_round_after_match?/1" do
    test "false если хотя бы одна пара ещё не отыграла обе игры" do
      # Две пары: [1,2] отыграла обе, [3,4] отыграла только одну
      matches =
        inline_matches([
          %Match{id: 1, player_ids: [1, 2], round_position: 0, state: "game_over"},
          %Match{id: 2, player_ids: [1, 2], round_position: 0, state: "game_over"},
          %Match{id: 3, player_ids: [3, 4], round_position: 0, state: "game_over"}
        ])

      tournament = build_inline_tournament(0, players_with_ratings(1..4))
      tournament = %{tournament | matches: matches}

      refute Top200.finish_round_after_match?(tournament)
    end

    test "false если ещё есть playing матчи" do
      matches =
        inline_matches([
          %Match{id: 1, player_ids: [1, 2], round_position: 0, state: "game_over"},
          %Match{id: 2, player_ids: [1, 2], round_position: 0, state: "playing"}
        ])

      tournament = build_inline_tournament(0, players_with_ratings(1..2))
      tournament = %{tournament | matches: matches}

      refute Top200.finish_round_after_match?(tournament)
    end

    test "true когда все пары отыграли по 2 игры и все завершены" do
      matches =
        inline_matches([
          %Match{id: 1, player_ids: [1, 2], round_position: 0, state: "game_over"},
          %Match{id: 2, player_ids: [1, 2], round_position: 0, state: "game_over"},
          %Match{id: 3, player_ids: [3, 4], round_position: 0, state: "timeout"},
          %Match{id: 4, player_ids: [3, 4], round_position: 0, state: "game_over"}
        ])

      tournament = build_inline_tournament(0, players_with_ratings(1..4))
      tournament = %{tournament | matches: matches}

      assert Top200.finish_round_after_match?(tournament)
    end
  end

  describe "build_round_pairs/1 — R7 finals" do
    test "4 финальных матча: за 1-2, 3-4, 5-6, 7-8 места" do
      tournament = insert_top200_tournament()

      # SF (R6) матчи в порядке: [1,4] (SF1), [2,3] (SF2), [5,8] (Cons1), [6,7] (Cons2)
      sf_matches =
        inline_matches([
          %Match{id: 10, player_ids: [1, 4], round_position: 6, state: "game_over"},
          %Match{id: 11, player_ids: [2, 3], round_position: 6, state: "game_over"},
          %Match{id: 12, player_ids: [5, 8], round_position: 6, state: "game_over"},
          %Match{id: 13, player_ids: [6, 7], round_position: 6, state: "game_over"}
        ])

      # Победители SF: 1, 2 → играют за 1-2; проигравшие SF: 4, 3 → играют за 3-4
      # Победители Cons: 5, 6 → за 5-6; проигравшие Cons: 8, 7 → за 7-8
      record_scores(tournament.id, 6, [
        {1, 100},
        {4, 50},
        {2, 100},
        {3, 50},
        {5, 100},
        {8, 50},
        {6, 100},
        {7, 50}
      ])

      tournament = put_inline(tournament, 7, players_with_ratings(1..8), sf_matches)
      {_, pairs} = Top200.build_round_pairs(tournament)

      assert pair_ids(pairs) == [
               # За 1-2
               [1, 2],
               # За 3-4
               [3, 4],
               # За 5-6
               [5, 6],
               # За 7-8
               [7, 8]
             ]
    end
  end

  # ---- helpers ----

  defp build_inline_tournament(round_position, players) do
    struct!(Tournament, %{
      id: System.unique_integer([:positive]),
      type: "top200",
      ranking_type: "by_user",
      rounds_limit: 8,
      current_round_position: round_position,
      players: players,
      matches: %{},
      played_pair_ids: MapSet.new(),
      meta: %{}
    })
  end

  defp inline_matches(matches) do
    Map.new(matches, fn match -> {Helpers.to_id(match.id), match} end)
  end

  defp insert_top200_tournament do
    insert(:tournament,
      type: "top200",
      ranking_type: "by_user",
      rounds_limit: 8,
      players: %{},
      matches: %{}
    )
  end

  defp put_inline(tournament, round_position, players, matches) do
    %{
      tournament
      | current_round_position: round_position,
        players: players,
        matches: matches
    }
  end

  defp players_with_ratings(ids) do
    Map.new(ids, fn id ->
      {id, Player.new!(%{id: id, name: "p#{id}", rating: id, state: "active"})}
    end)
  end

  defp record_scores(tournament_id, round_position, user_scores) do
    Enum.each(user_scores, fn {user_id, score} ->
      insert(:tournament_result,
        tournament_id: tournament_id,
        user_id: user_id,
        user_name: "p#{user_id}",
        user_lang: "js",
        score: score,
        duration_sec: user_id,
        round_position: round_position
      )
    end)
  end

  defp record_played_game(tournament_id, round_position, {p1_id, p1_score}, {p2_id, p2_score}) do
    game_id = System.unique_integer([:positive])

    insert(:tournament_result,
      tournament_id: tournament_id,
      user_id: p1_id,
      user_name: "p#{p1_id}",
      game_id: game_id,
      score: p1_score,
      duration_sec: 1,
      round_position: round_position
    )

    insert(:tournament_result,
      tournament_id: tournament_id,
      user_id: p2_id,
      user_name: "p#{p2_id}",
      game_id: game_id,
      score: p2_score,
      duration_sec: 1,
      round_position: round_position
    )
  end

  defp pair_ids(pairs) do
    Enum.map(pairs, &pair_to_sorted_ids/1)
  end

  defp pair_to_sorted_ids(pair) do
    pair |> Enum.map(& &1.id) |> Enum.sort()
  end
end
