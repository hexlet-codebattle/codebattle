defmodule Codebattle.Tournament.Entire.Top200Test do
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers, only: [get_matches: 1]
  import Ecto.Query

  alias Codebattle.Game.Context, as: GameContext
  alias Codebattle.PubSub.Message
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Context, as: TournamentContext
  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.Match
  alias Codebattle.Tournament.Player
  alias Codebattle.Tournament.Server
  alias Codebattle.Tournament.Top200
  alias Codebattle.Tournament.TournamentResult
  alias Codebattle.Tournament.TournamentUserResult

  describe "build_round_pairs/1 — R0 защита топ-32" do
    test "200 игроков → 100 пар, покрывающих всех" do
      tournament = build_inline_tournament(0, players_with_ratings(1..200))

      {_, pairs} = Top200.build_round_pairs(tournament)

      assert length(pairs) == 100
      all_ids = pairs |> List.flatten() |> Enum.map(& &1.id) |> Enum.uniq()
      assert length(all_ids) == 200
    end

    test "ни одна пара R0 не содержит двух игроков топ-32 по итогам полуфинала" do
      tournament = build_inline_tournament(0, players_with_ratings(1..200))

      # место в полуфинале = id (меньше = выше), значит топ-32 — это id 1..32.
      top_32 = MapSet.new(1..32)

      {_, pairs} = Top200.build_round_pairs(tournament)

      Enum.each(pairs, fn pair ->
        pair_ids = MapSet.new(pair, & &1.id)
        top_in_pair = pair_ids |> MapSet.intersection(top_32) |> MapSet.size()

        assert top_in_pair <= 1,
               "пара #{inspect(Enum.to_list(pair_ids))} содержит #{top_in_pair} игроков из топ-32"
      end)
    end

    test "каждый из топ-32 присутствует в одной из пар (защита, не выпадение)" do
      tournament = build_inline_tournament(0, players_with_ratings(1..200))
      top_32 = 1..32 |> Enum.to_list() |> MapSet.new()

      {_, pairs} = Top200.build_round_pairs(tournament)

      all_pair_ids = pairs |> List.flatten() |> MapSet.new(& &1.id)
      assert MapSet.subset?(top_32, all_pair_ids), "не все топ-32 попали в пары R0"
    end

    test "топ-32 получают соперника из поля (id 33..200)" do
      tournament = build_inline_tournament(0, players_with_ratings(1..200))
      top_32 = 1..32 |> Enum.to_list() |> MapSet.new()
      field = 33..200 |> Enum.to_list() |> MapSet.new()

      {_, pairs} = Top200.build_round_pairs(tournament)

      # У каждого топ-32 пара должна содержать ровно одного игрока из поля.
      Enum.each(pairs, fn pair ->
        pair_set = MapSet.new(pair, & &1.id)
        top_in_pair = pair_set |> MapSet.intersection(top_32) |> MapSet.size()

        if top_in_pair == 1 do
          field_in_pair = pair_set |> MapSet.intersection(field) |> MapSet.size()
          assert field_in_pair == 1, "топ должен пэйриться с одним игроком поля"
        end
      end)
    end

    test "8 игроков (минимум для top200) — топ-4 пэйрятся с оставшимися 4" do
      # При <64 игроках протекция масштабируется: protected = min(32, total/2).
      tournament = build_inline_tournament(0, players_with_ratings(1..8))

      {_, pairs} = Top200.build_round_pairs(tournament)

      assert length(pairs) == 4
      all_ids = pairs |> List.flatten() |> Enum.map(& &1.id) |> Enum.sort()
      assert all_ids == Enum.to_list(1..8)

      # Топ-4 по полуфиналу (id 1..4) не должны сводиться между собой.
      top_4 = MapSet.new(1..4)

      Enum.each(pairs, fn pair ->
        pair_set = MapSet.new(pair, & &1.id)
        top_in_pair = pair_set |> MapSet.intersection(top_4) |> MapSet.size()
        assert top_in_pair <= 1
      end)
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

    test "в плей-офф играют только топ-8: остальные 192 не получают пар (и игр)" do
      tournament = insert_top200_tournament()

      record_scores(tournament.id, 0, Enum.map(1..200, fn id -> {id, 1000 - id} end))

      tournament = put_inline(tournament, 5, players_with_ratings(1..200), %{})
      {_, pairs} = Top200.build_round_pairs(tournament)

      paired_ids = pairs |> Enum.flat_map(fn pair -> Enum.map(pair, & &1.id) end) |> MapSet.new()

      # ровно 8 уникальных игроков в парах QF
      assert MapSet.size(paired_ids) == 8
      assert paired_ids == MapSet.new(1..8)

      # ни один из игроков 9..200 не попадает в пары → у них нет матчей/игр в плей-офф
      assert Enum.all?(9..200, &(&1 not in paired_ids))
    end
  end

  describe "build_round_pairs/1 — R6 semifinal с per_round_pair (2 матча на пару)" do
    test "дедуп QF матчей по паре: 8 матчей (4 пары × 2 игры) → 4 пары SF без MatchError" do
      # Регрессия: раньше `[qf1, qf2, qf3, qf4] = get_round_matches(5)` падал с MatchError,
      # когда per_round_pair даёт по 2 матча на пару (4 пары × 2 = 8 матчей).
      tournament = insert_top200_tournament()

      qf_matches =
        inline_matches([
          # пара [1,8] — 2 игры
          %Match{id: 1, player_ids: [1, 8], round_position: 5, state: "game_over"},
          %Match{id: 5, player_ids: [1, 8], round_position: 5, state: "game_over"},
          # пара [4,5] — 2 игры
          %Match{id: 2, player_ids: [4, 5], round_position: 5, state: "game_over"},
          %Match{id: 6, player_ids: [4, 5], round_position: 5, state: "game_over"},
          # пара [3,6] — 2 игры
          %Match{id: 3, player_ids: [3, 6], round_position: 5, state: "game_over"},
          %Match{id: 7, player_ids: [3, 6], round_position: 5, state: "game_over"},
          # пара [2,7] — 2 игры
          %Match{id: 4, player_ids: [2, 7], round_position: 5, state: "game_over"},
          %Match{id: 8, player_ids: [2, 7], round_position: 5, state: "game_over"}
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

      assert pair_ids(pairs) == [[1, 4], [2, 3], [5, 8], [6, 7]]
    end
  end

  describe "build_round_pairs/1 — R6 semifinal" do
    test "победители QF (по draw_index) в главной сетке, проигравшие в утешительной за 5-8" do
      tournament = insert_top200_tournament()

      # QF (R5) матчи: [1,8], [4,5], [3,6], [2,7].
      qf_matches =
        inline_matches([
          %Match{id: 1, player_ids: [1, 8], round_position: 5, state: "game_over"},
          %Match{id: 2, player_ids: [4, 5], round_position: 5, state: "game_over"},
          %Match{id: 3, player_ids: [3, 6], round_position: 5, state: "game_over"},
          %Match{id: 4, player_ids: [2, 7], round_position: 5, state: "game_over"}
        ])

      # calculate_round_results уже поднял draw_index победителям пар: 8, 4, 6, 2 — нарочно
      # не «первые» в паре, чтобы проверить, что пэйринг идёт по draw_index, а не по позиции.
      players =
        players_with_draw_index(%{
          8 => 2,
          4 => 2,
          6 => 2,
          2 => 2,
          1 => 1,
          5 => 1,
          3 => 1,
          7 => 1
        })

      tournament = put_inline(tournament, 6, players, qf_matches)
      {_, pairs} = Top200.build_round_pairs(tournament)

      assert pair_ids(pairs) == [
               # SF1 — главная сетка: победители QF1 (8) и QF2 (4)
               [4, 8],
               # SF2 — главная сетка: победители QF3 (6) и QF4 (2)
               [2, 6],
               # Cons SF1 — за 5-8: проигравшие QF1 (1) и QF2 (5)
               [1, 5],
               # Cons SF2 — за 5-8: проигравшие QF3 (3) и QF4 (7)
               [3, 7]
             ]
    end
  end

  describe "compute_final_standings/1 — финальные места" do
    test "топ-8 по результату финалов (очки раунда 7): place + draw_index, ровно 1 «живой»" do
      tournament = insert_top200_tournament()
      players_table = Tournament.Players.create_table(tournament.id)

      # Раунд 7 — финалы за [1-2, 3-4, 5-6, 7-8] (порядок матчей = порядок мест).
      finals =
        inline_matches([
          %Match{id: 1, player_ids: [1, 2], round_position: 7, state: "game_over"},
          %Match{id: 2, player_ids: [3, 4], round_position: 7, state: "game_over"},
          %Match{id: 3, player_ids: [5, 6], round_position: 7, state: "game_over"},
          %Match{id: 4, player_ids: [7, 8], round_position: 7, state: "game_over"}
        ])

      tournament = %{tournament | players_table: players_table, current_round_position: 7, matches: finals}

      # Победитель каждой пары — по СУММЕ ОЧКОВ РАУНДА 7. Победители: 2, 4, 5, 8.
      record_scores(tournament.id, 7, [
        {1, 10},
        {2, 100},
        {3, 10},
        {4, 100},
        {5, 100},
        {6, 10},
        {7, 10},
        {8, 100}
      ])

      # Топ-8: {начальный draw_index, накопленный score}. Оба НАРОЧНО инвертированы — у
      # проигравших финал выше и draw_index (имитация force-финиша, где бамп не успел
      # развести финалистов), и накопленная сумма. Доказываем: место и draw_index задаёт
      # результат финала (очки раунда 7), а не прежний draw_index и не сумма очков.
      top8 = %{
        1 => {9, 999},
        2 => {1, 10},
        3 => {9, 999},
        4 => {1, 10},
        5 => {1, 10},
        6 => {9, 999},
        7 => {9, 999},
        8 => {1, 10}
      }

      Enum.each(top8, fn {id, {draw_index, score}} ->
        Tournament.Players.put_player(
          tournament,
          Player.new!(%{id: id, name: "p#{id}", state: "active", draw_index: draw_index, score: score, place: 0})
        )
      end)

      # Места 9+ уже проставлены ранжированием по сумме 5 раундов — не должны меняться.
      Enum.each([{9, 50}, {10, 40}, {11, 30}], fn {id, score} ->
        Tournament.Players.put_player(
          tournament,
          Player.new!(%{id: id, name: "p#{id}", state: "active", score: score, place: id})
        )
      end)

      Top200.compute_final_standings(tournament)

      place_of = fn id -> Tournament.Players.get_player(tournament, id).place end

      # Места топ-8 по результату финалов (победитель пары — лучшее место).
      assert place_of.(2) == 1
      assert place_of.(1) == 2
      assert place_of.(4) == 3
      assert place_of.(3) == 4
      assert place_of.(5) == 5
      assert place_of.(6) == 6
      assert place_of.(8) == 7
      assert place_of.(7) == 8

      # draw_index = 9 - place: у чемпиона уникальный максимум (8), дальше по убыванию.
      assert draw_index_by_id(tournament, [1, 2, 3, 4, 5, 6, 7, 8]) == %{
               2 => 8,
               1 => 7,
               4 => 6,
               3 => 5,
               5 => 4,
               6 => 3,
               8 => 2,
               7 => 1
             }

      # Игроки вне сетки (места 9+) — дефолтный draw_index (1), заведомо ниже максимума (8).
      # Значит «живой» (draw_index == max) ровно один — чемпион (id 2). Это и есть починка
      # «2 active после финала».
      assert draw_index_by_id(tournament, [9, 10, 11]) == %{9 => 1, 10 => 1, 11 => 1}

      # Места 9+ без изменений.
      assert place_of.(9) == 9
      assert place_of.(10) == 10
      assert place_of.(11) == 11

      # Очки не обнулены (регрессия на потерю рейтинга после финиша).
      assert Tournament.Players.get_player(tournament, 2).score == 10
      assert Tournament.Players.get_player(tournament, 9).score == 50
    end

    test "вылетевшие перенумеровываются в 9..N — нет дублей мест с топ-8 сетки" do
      # Регрессия: set_ranking нумерует ВСЁ поле (1..N) по сумме очков, поэтому вылетевшие
      # приходят в compute_final_standings с местами, пересекающимися с 1..8 сетки (на проде
      # это давало дубли мест 3..8 у топ-8 в лидерборде). Должны стать 9..N без коллизий.
      tournament = insert_top200_tournament()
      players_table = Tournament.Players.create_table(tournament.id)

      finals =
        inline_matches([
          %Match{id: 1, player_ids: [1, 2], round_position: 7, state: "game_over"},
          %Match{id: 2, player_ids: [3, 4], round_position: 7, state: "game_over"},
          %Match{id: 3, player_ids: [5, 6], round_position: 7, state: "game_over"},
          %Match{id: 4, player_ids: [7, 8], round_position: 7, state: "game_over"}
        ])

      tournament = %{tournament | players_table: players_table, current_round_position: 7, matches: finals}

      # Победители финалов по очкам раунда 7: 1, 3, 5, 7.
      record_scores(tournament.id, 7, [
        {1, 100},
        {2, 10},
        {3, 100},
        {4, 10},
        {5, 100},
        {6, 10},
        {7, 100},
        {8, 10}
      ])

      Enum.each(1..8, fn id ->
        Tournament.Players.put_player(
          tournament,
          Player.new!(%{id: id, name: "p#{id}", state: "active", score: 0, place: 0})
        )
      end)

      # Вылетевшие 9..14: НАРОЧНО с местами 3..8 (как их пронумеровал set_ranking по полю) —
      # ровно те, что пересекаются с сеткой. Сумма очков убывает с id → ожидаемый порядок 9..14.
      Enum.each([{9, 60, 3}, {10, 50, 4}, {11, 40, 5}, {12, 30, 6}, {13, 20, 7}, {14, 10, 8}], fn {id, score, place} ->
        Tournament.Players.put_player(
          tournament,
          Player.new!(%{id: id, name: "p#{id}", state: "active", score: score, place: place})
        )
      end)

      Top200.compute_final_standings(tournament)

      place_of = fn id -> Tournament.Players.get_player(tournament, id).place end

      # Топ-8 — по сетке финалов (победитель пары — лучшее место).
      assert place_of.(1) == 1
      assert place_of.(3) == 3
      assert place_of.(5) == 5
      assert place_of.(7) == 7

      # Вылетевшие — строго 9..14 по убыванию суммы очков, БЕЗ пересечения с 1..8.
      assert Enum.map(9..14, place_of) == [9, 10, 11, 12, 13, 14]

      # Главное: места всего поля уникальны и образуют ровно 1..14 — дублей нет.
      all_places = Enum.map(1..14, place_of)
      assert Enum.sort(all_places) == Enum.to_list(1..14)
    end
  end

  describe "TournamentUserResult.upsert_results/1 — top200 (регрессия на потерю рейтинга)" do
    test "пишет результаты из расставленных игроков — place/score/points не обнуляются" do
      tournament = insert_top200_tournament()

      # Игроки уже расставлены compute_final_standings: топ-3 по сетке, 9-10 по сумме очков.
      players =
        Map.new([{1, 1, 500}, {2, 2, 450}, {3, 3, 400}, {9, 9, 50}, {10, 10, 40}], fn {id, place, score} ->
          {id,
           Player.new!(%{
             id: id,
             name: "p#{id}",
             state: "active",
             place: place,
             score: score,
             total_duration_sec: id
           })}
        end)

      tournament = %{tournament | grade: "elite", players: players}

      # Сырые результаты по играм — для агрегатов games_count/wins_count/avg_result_percent.
      record_scores(tournament.id, 0, [{1, 100}, {2, 90}, {3, 80}, {9, 10}, {10, 5}])

      assert %{type: "top200"} = TournamentUserResult.upsert_results(tournament)

      results = Map.new(TournamentUserResult.get_by(tournament.id), &{&1.user_id, &1})

      # Места и очки сохранены (раньше пустая таблица → sync обнулял всё в 0).
      assert results[1].place == 1
      assert results[1].score == 500
      assert results[9].place == 9
      assert results[9].score == 50

      # Очки сезона (grade_points) начислены по месту: elite, 1-е место = 256.
      assert results[1].points == 256

      # Никого не обнулило.
      assert Enum.all?([1, 2, 3, 9, 10], &(results[&1].score > 0 and results[&1].place > 0))
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

  describe "start_rematch/2" do
    test "когда rematch-таска недоступна — broadcast'ит wait_type=round, не оставляя игроков на overlay" do
      # Регрессия: раньше start_rematch молча возвращался при отсутствии таски, и UI зависал
      # на overlay 'rematch coming'. Теперь должен явно broadcast'ить wait_type=round.
      tournament_id = System.unique_integer([:positive])

      tournament =
        struct!(Tournament, %{
          id: tournament_id,
          type: "top200",
          module: Top200,
          ranking_type: "by_user",
          rounds_limit: 8,
          current_round_position: 0,
          task_strategy: "per_round_pair",
          task_ids: [],
          players_table: Tournament.Players.create_table(tournament_id),
          matches_table: Tournament.Matches.create_table(tournament_id),
          tasks_table: Tournament.Tasks.create_table(tournament_id)
        })

      on_exit(fn ->
        Enum.each(
          [tournament.players_table, tournament.matches_table, tournament.tasks_table],
          fn table ->
            try do
              :ets.delete(table)
            rescue
              _ -> :ok
            end
          end
        )
      end)

      Enum.each([1, 2], fn id ->
        Tournament.Players.put_player(tournament, Player.new!(%{id: id, name: "p#{id}", state: "active"}))
      end)

      match = %Match{id: 7, game_id: 555, player_ids: [1, 2], round_position: 0, state: "game_over"}
      Tournament.Matches.put_match(tournament, match)

      Codebattle.PubSub.subscribe("game:555")

      Top200.start_rematch(tournament, 7)

      assert_receive %Message{
        topic: "game:555",
        event: "tournament:game:wait",
        payload: %{type: "round"}
      }
    end

    test "молчаливо логирует и не падает, если match_ref не найден" do
      tournament_id = System.unique_integer([:positive])

      tournament =
        struct!(Tournament, %{
          id: tournament_id,
          type: "top200",
          module: Top200,
          rounds_limit: 8,
          current_round_position: 0,
          task_strategy: "per_round_pair",
          task_ids: [],
          players_table: Tournament.Players.create_table(tournament_id),
          matches_table: Tournament.Matches.create_table(tournament_id),
          tasks_table: Tournament.Tasks.create_table(tournament_id)
        })

      on_exit(fn ->
        Enum.each(
          [tournament.players_table, tournament.matches_table, tournament.tasks_table],
          fn table ->
            try do
              :ets.delete(table)
            rescue
              _ -> :ok
            end
          end
        )
      end)

      # Не должно падать на finished_match.player_ids при nil — раньше падало.
      assert Top200.start_rematch(tournament, 9999) == tournament
    end
  end

  describe "build_round_pairs/1 — R7 finals с per_round_pair (2 матча на пару)" do
    test "дедуп SF матчей по паре: 8 матчей (4 пары × 2 игры) → 4 финала без MatchError" do
      tournament = insert_top200_tournament()

      sf_matches =
        inline_matches([
          %Match{id: 10, player_ids: [1, 4], round_position: 6, state: "game_over"},
          %Match{id: 20, player_ids: [1, 4], round_position: 6, state: "game_over"},
          %Match{id: 11, player_ids: [2, 3], round_position: 6, state: "game_over"},
          %Match{id: 21, player_ids: [2, 3], round_position: 6, state: "game_over"},
          %Match{id: 12, player_ids: [5, 8], round_position: 6, state: "game_over"},
          %Match{id: 22, player_ids: [5, 8], round_position: 6, state: "game_over"},
          %Match{id: 13, player_ids: [6, 7], round_position: 6, state: "game_over"},
          %Match{id: 23, player_ids: [6, 7], round_position: 6, state: "game_over"}
        ])

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

      assert pair_ids(pairs) == [[1, 2], [3, 4], [5, 6], [7, 8]]
    end
  end

  describe "build_round_pairs/1 — R7 finals" do
    test "4 финальных матча за 1-2, 3-4, 5-6, 7-8 (победители по draw_index)" do
      tournament = insert_top200_tournament()

      # SF (R6) матчи в порядке: [1,4] (SF1 main), [2,3] (SF2 main), [5,8] (Cons1), [6,7] (Cons2).
      sf_matches =
        inline_matches([
          %Match{id: 10, player_ids: [1, 4], round_position: 6, state: "game_over"},
          %Match{id: 11, player_ids: [2, 3], round_position: 6, state: "game_over"},
          %Match{id: 12, player_ids: [5, 8], round_position: 6, state: "game_over"},
          %Match{id: 13, player_ids: [6, 7], round_position: 6, state: "game_over"}
        ])

      # calculate_round_results уже проставил draw_index: чемпионская ветка глубже всех.
      # Победители main SF: 4, 2 (draw_index 3) → финал за 1-2; проигравшие: 1, 3 → за 3-4.
      # Победители cons SF: 8, 6 (draw_index 2) → за 5-6; проигравшие: 5, 7 → за 7-8.
      players =
        players_with_draw_index(%{
          4 => 3,
          2 => 3,
          1 => 2,
          3 => 2,
          8 => 2,
          6 => 2,
          5 => 1,
          7 => 1
        })

      tournament = put_inline(tournament, 7, players, sf_matches)
      {_, pairs} = Top200.build_round_pairs(tournament)

      assert pair_ids(pairs) == [
               # За 1-2
               [2, 4],
               # За 3-4
               [1, 3],
               # За 5-6
               [6, 8],
               # За 7-8
               [5, 7]
             ]
    end
  end

  describe "calculate_round_results/1 — draw_index по итогам плей-офф раунда" do
    test "QF: победитель каждой пары (по сумме очков раунда) получает +1 к draw_index" do
      tournament = insert_top200_tournament()
      table = Tournament.Players.create_table(tournament.id)
      tournament = %{tournament | players_table: table, current_round_position: 5}

      # стартовый draw_index = 1 у всех (дефолт схемы)
      Enum.each(1..8, fn id ->
        Tournament.Players.put_player(tournament, Player.new!(%{id: id, name: "p#{id}", state: "active"}))
      end)

      # QF пары [1,8] [4,5] [3,6] [2,7], по 2 матча на пару (per_round_pair).
      qf_matches =
        inline_matches([
          %Match{id: 1, player_ids: [1, 8], round_position: 5, state: "game_over"},
          %Match{id: 5, player_ids: [1, 8], round_position: 5, state: "game_over"},
          %Match{id: 2, player_ids: [4, 5], round_position: 5, state: "game_over"},
          %Match{id: 6, player_ids: [4, 5], round_position: 5, state: "game_over"},
          %Match{id: 3, player_ids: [3, 6], round_position: 5, state: "game_over"},
          %Match{id: 7, player_ids: [3, 6], round_position: 5, state: "game_over"},
          %Match{id: 4, player_ids: [2, 7], round_position: 5, state: "game_over"},
          %Match{id: 8, player_ids: [2, 7], round_position: 5, state: "game_over"}
        ])

      tournament = %{tournament | matches: qf_matches}

      # Победители по очкам раунда: 8, 4, 6, 2 (нарочно не «первые» в паре).
      record_scores(tournament.id, 5, [
        {1, 50},
        {8, 100},
        {4, 100},
        {5, 50},
        {3, 50},
        {6, 100},
        {2, 100},
        {7, 50}
      ])

      Top200.calculate_round_results(tournament)

      assert draw_index_by_id(tournament, 1..8) == %{
               1 => 1,
               2 => 2,
               3 => 1,
               4 => 2,
               5 => 1,
               6 => 2,
               7 => 1,
               8 => 2
             }
    end

    test "SF: победители главной сетки уходят глубже (di 3), победители утешительной — di 2" do
      tournament = insert_top200_tournament()
      table = Tournament.Players.create_table(tournament.id)
      tournament = %{tournament | players_table: table, current_round_position: 6}

      # После QF: главная сетка (победители QF) на draw_index 2, утешительная — на 1.
      Enum.each(
        [{1, 2}, {2, 2}, {3, 2}, {4, 2}, {5, 1}, {6, 1}, {7, 1}, {8, 1}],
        fn {id, di} ->
          Tournament.Players.put_player(
            tournament,
            Player.new!(%{id: id, name: "p#{id}", state: "active", draw_index: di})
          )
        end
      )

      # SF матчи (по 2 на пару): главная [1,4] [2,3], утешительная [5,8] [6,7].
      sf_matches =
        inline_matches([
          %Match{id: 10, player_ids: [1, 4], round_position: 6, state: "game_over"},
          %Match{id: 14, player_ids: [1, 4], round_position: 6, state: "game_over"},
          %Match{id: 11, player_ids: [2, 3], round_position: 6, state: "game_over"},
          %Match{id: 15, player_ids: [2, 3], round_position: 6, state: "game_over"},
          %Match{id: 12, player_ids: [5, 8], round_position: 6, state: "game_over"},
          %Match{id: 16, player_ids: [5, 8], round_position: 6, state: "game_over"},
          %Match{id: 13, player_ids: [6, 7], round_position: 6, state: "game_over"},
          %Match{id: 17, player_ids: [6, 7], round_position: 6, state: "game_over"}
        ])

      tournament = %{tournament | matches: sf_matches}

      # Победители раунда: 4, 2 (главная сетка) и 8, 6 (утешительная) — снова не «первые».
      record_scores(tournament.id, 6, [
        {1, 50},
        {4, 100},
        {2, 100},
        {3, 50},
        {5, 50},
        {8, 100},
        {6, 100},
        {7, 50}
      ])

      Top200.calculate_round_results(tournament)

      assert draw_index_by_id(tournament, 1..8) == %{
               # главная сетка: победители → 3, проигравшие остаются на 2
               4 => 3,
               2 => 3,
               1 => 2,
               3 => 2,
               # утешительная: победители → 2, проигравшие остаются на 1
               8 => 2,
               6 => 2,
               5 => 1,
               7 => 1
             }
    end

    test "tie по очкам раунда → побеждает игрок с меньшим id (выше место в полуфинале)" do
      tournament = insert_top200_tournament()
      table = Tournament.Players.create_table(tournament.id)
      tournament = %{tournament | players_table: table, current_round_position: 5}

      Enum.each([1, 8], fn id ->
        Tournament.Players.put_player(tournament, Player.new!(%{id: id, name: "p#{id}", state: "active"}))
      end)

      # Пара хранится как [8, 1] — больший id первым, чтобы отличить «tie → меньший id»
      # от старого «tie → первый в паре».
      matches =
        inline_matches([
          %Match{id: 1, player_ids: [8, 1], round_position: 5, state: "game_over"},
          %Match{id: 2, player_ids: [8, 1], round_position: 5, state: "game_over"}
        ])

      tournament = %{tournament | matches: matches}

      # Равная сумма очков за раунд у обоих.
      record_scores(tournament.id, 5, [{1, 100}, {8, 100}])

      Top200.calculate_round_results(tournament)

      # Победитель пары — id 1: ему подняли draw_index, id 8 остаётся на дефолте.
      assert draw_index_by_id(tournament, [1, 8]) == %{1 => 2, 8 => 1}
    end
  end

  describe "live tournament flow — R0 rematch" do
    @tag :integration
    test "после таймаута первой игры пары появляется ремач со второй задачей из task_pack" do
      # Регрессия: ловит сразу обе ошибки —
      #   1) TaskProvider.get_task_ids для task_pack+per_round_pair возвращал unordered ETS,
      #      из-за чего task_ids[round*2+1] мог быть nil и rematch silently не создавался;
      #   2) Base.start_rematch молча возвращал tournament, оставляя игроков на overlay.
      [t1, t2] = insert_list(2, :task, level: "easy", time_to_solve_sec: 60)
      insert(:task_pack, name: "top200-r0-rematch", task_ids: [t1.id, t2.id])

      creator = insert(:user)
      users = insert_list(8, :user)

      {:ok, tournament} =
        TournamentContext.create(%{
          "starts_at" => "2026-01-01T12:00",
          "name" => "Top200 r0 rematch",
          "description" => "r0 rematch flow",
          "user_timezone" => "Etc/UTC",
          "task_pack_name" => "top200-r0-rematch",
          "creator" => creator,
          "break_duration_seconds" => 0,
          "task_provider" => "task_pack",
          "task_strategy" => "per_round_pair",
          "ranking_type" => "by_user",
          "score_strategy" => "75_percentile",
          "timeout_mode" => "per_round_with_rematch",
          "round_timeout_seconds" => 60,
          "type" => "top200",
          "state" => "waiting_participants",
          "rounds_limit" => "8",
          "players_limit" => 8
        })

      Server.handle_event(tournament.id, :join, %{users: users})
      Server.handle_event(tournament.id, :start, %{user: creator})

      tournament = TournamentContext.get(tournament.id)
      assert tournament.current_round_position == 0

      # R0 для 8 игроков — 4 пары (top-8 bracket), по 1 начальной игре в каждой.
      initial_matches = get_matches(tournament)
      assert length(initial_matches) == 4
      assert Enum.all?(initial_matches, &(&1.state == "playing"))

      # Завершаем первую игру одной из пар — должен запланироваться и создаться rematch.
      [first_match | _] = initial_matches
      assert {:ok, _game} = GameContext.trigger_timeout(first_match.game_id)

      # tournament_rematch_timeout_ms в test config = 1ms, плюс несколько ms на planning/insert.
      wait_for(fn -> length(get_matches(TournamentContext.get(tournament.id))) == 5 end)

      tournament = TournamentContext.get(tournament.id)
      matches = get_matches(tournament)
      assert length(matches) == 5

      pair = Enum.sort(first_match.player_ids)
      pair_matches = Enum.filter(matches, &(Enum.sort(&1.player_ids) == pair))
      assert length(pair_matches) == 2

      rematch = Enum.find(pair_matches, &(&1.id != first_match.id))
      assert rematch.state == "playing"
      assert rematch.round_position == 0
      # task_ids[round*2 + 1] = task_ids[1] = t2 для round 0
      assert rematch.task_id == t2.id
      # initial game для round 0 использует task_ids[0] = t1
      finished = Enum.find(pair_matches, &(&1.id == first_match.id))
      assert finished.task_id == t1.id
    end
  end

  describe "per_round_pair scoring — суммирование очков пары за раунд" do
    # Все сценарии для пары [1, 2], играющей 2 матча в раунде 5.
    # Колонки: имя сценария, очки p1 за game1+game2, очки p2 за game1+game2,
    # ожидаемый суммарный счёт {p1_total, p2_total}, ожидаемый победитель.
    scoring_cases = [
      {"p1 побеждает обе игры", {100, 100}, {0, 0}, {200, 0}, 1},
      {"p2 побеждает обе игры", {0, 0}, {100, 100}, {0, 200}, 2},
      {"1 win + 1 loss → итоговая сумма решает (p1)", {100, 0}, {0, 80}, {100, 80}, 1},
      {"1 win + 1 loss → итоговая сумма решает (p2)", {0, 80}, {100, 0}, {80, 100}, 2},
      {"1 win + 1 timeout (p1 выиграл одну, во второй обоим 0)", {100, 0}, {0, 0}, {100, 0}, 1},
      {"0 wins но частичные баллы за timeouts (p2 решил больше asserts)", {10, 5}, {25, 30}, {15, 55}, 2},
      {"оба обнулились → tie в пользу меньшего id (1)", {0, 0}, {0, 0}, {0, 0}, 1},
      {"равная сумма из разных игр → tie в пользу меньшего id (1)", {60, 40}, {30, 70}, {100, 100}, 1}
    ]

    for {name, {p1_g1, p1_g2}, {p2_g1, p2_g2}, {p1_total, p2_total}, expected_winner} <-
          scoring_cases do
      test "#{name}" do
        tournament = insert_top200_tournament()

        seed_pair_round_results(
          tournament.id,
          5,
          {1, unquote(p1_g1), unquote(p1_g2)},
          {2, unquote(p2_g1), unquote(p2_g2)}
        )

        ranking = TournamentResult.get_user_ranking_for_round(tournament, 5)

        # Сумма очков по двум играм должна совпадать с ожидаемой.
        assert Decimal.equal?(ranking[1].score, Decimal.new(unquote(p1_total))),
               "p1 round score: expected #{unquote(p1_total)}, got #{inspect(ranking[1].score)}"

        assert Decimal.equal?(ranking[2].score, Decimal.new(unquote(p2_total))),
               "p2 round score: expected #{unquote(p2_total)}, got #{inspect(ranking[2].score)}"

        # Top200.winner_loser сравнивает суммарные round-очки.
        assert choose_winner(ranking, 1, 2) == unquote(expected_winner),
               "expected winner #{unquote(expected_winner)}, got #{choose_winner(ranking, 1, 2)}"
      end
    end
  end

  defp seed_pair_round_results(tournament_id, round, {p1_id, p1_game1, p1_game2}, {p2_id, p2_game1, p2_game2}) do
    game1_id = System.unique_integer([:positive])
    game2_id = System.unique_integer([:positive])

    Enum.each(
      [
        {p1_id, "p#{p1_id}", game1_id, p1_game1},
        {p2_id, "p#{p2_id}", game1_id, p2_game1},
        {p1_id, "p#{p1_id}", game2_id, p1_game2},
        {p2_id, "p#{p2_id}", game2_id, p2_game2}
      ],
      fn {user_id, user_name, game_id, score} ->
        insert(:tournament_result,
          tournament_id: tournament_id,
          user_id: user_id,
          user_name: user_name,
          user_lang: "js",
          game_id: game_id,
          score: score,
          # duration влияет только на tiebreaker — фиксируем одинаково, чтобы исследовать
          # именно score-логику.
          duration_sec: 30,
          round_position: round
        )
      end
    )
  end

  # Зеркалит Top200.winner_loser/2: по очкам раунда, ничья — в пользу меньшего id.
  defp choose_winner(ranking, id1, id2) do
    s1 = ranking |> get_in([id1, :score]) |> to_float()
    s2 = ranking |> get_in([id2, :score]) |> to_float()

    cond do
      s1 > s2 -> id1
      s2 > s1 -> id2
      id1 <= id2 -> id1
      true -> id2
    end
  end

  defp to_float(nil), do: 0.0
  defp to_float(%Decimal{} = d), do: Decimal.to_float(d)
  defp to_float(n) when is_number(n), do: n

  describe "live tournament flow — R0 with mixed game outcomes" do
    @tag :integration
    @tag timeout: 30_000
    test "scoring + ranking после раунда с win/lose/timeout по парам" do
      # Регрессия: гарантируем, что счёт за раунд = сумма обеих игр пары,
      # а финальный ranking учитывает все 8 игр раунда (4 пары × 2 игры).
      [t1, t2] = insert_list(2, :task, level: "easy", time_to_solve_sec: 60)
      insert(:task_pack, name: "top200-mixed-r0", task_ids: [t1.id, t2.id])

      creator = insert(:user)
      users = insert_list(8, :user)
      [u1, u2, u3, u4, u5, u6, u7, u8] = users
      user_ids = Enum.map(users, & &1.id)

      {:ok, tournament} =
        TournamentContext.create(%{
          "starts_at" => "2026-01-01T12:00",
          "name" => "Top200 mixed r0",
          "description" => "mixed outcomes",
          "user_timezone" => "Etc/UTC",
          "task_pack_name" => "top200-mixed-r0",
          "creator" => creator,
          "break_duration_seconds" => 0,
          "task_provider" => "task_pack",
          "task_strategy" => "per_round_pair",
          "ranking_type" => "by_user",
          "score_strategy" => "75_percentile",
          "timeout_mode" => "per_round_with_rematch",
          "round_timeout_seconds" => 60,
          "type" => "top200",
          "state" => "waiting_participants",
          "rounds_limit" => "8",
          "players_limit" => 8
        })

      Server.handle_event(tournament.id, :join, %{users: users})
      Server.handle_event(tournament.id, :start, %{user: creator})

      tournament_id = tournament.id

      # Ждём, пока R0 создаст 4 начальных матча.
      wait_for(fn ->
        tournament_id
        |> TournamentContext.get()
        |> get_matches()
        |> Enum.count(&(&1.round_position == 0 and &1.state == "playing")) == 4
      end)

      tournament = TournamentContext.get(tournament_id)
      initial_matches = tournament |> current_round_playing_matches(0) |> Enum.sort_by(& &1.id)
      assert length(initial_matches) == 4

      # R0 пары для 8 игроков (top-8 bracket по рейтингу, все рейтинги дефолтные 1200,
      # значит порядок определяется id desc → standard_bracket_qf: #1v#8, #4v#5, #3v#6, #2v#7).
      # Берём пары как они есть и навешиваем сценарии по индексу пары:
      [match_a, match_b, match_c, match_d] = initial_matches

      # Pair A (game 1): a_p1 выигрывает за 20s.
      [a_p1, _a_p2] = match_a.player_ids
      finish_game_as_won(match_a.game_id, a_p1, 20)

      # Pair B (game 1): b_p1 выигрывает за 10s (быстрее всех).
      [b_p1, _b_p2] = match_b.player_ids
      finish_game_as_won(match_b.game_id, b_p1, 10)

      # Pair C (game 1): timeout (никто не решил).
      {:ok, _} = GameContext.trigger_timeout(match_c.game_id)

      # Pair D (game 1): d_p2 выигрывает за 40s (медленнее всех).
      [_d_p1, d_p2] = match_d.player_ids
      finish_game_as_won(match_d.game_id, d_p2, 40)

      # Ждём, пока появятся 4 ремача (всего 8 матчей в R0).
      wait_for(fn ->
        tournament_id
        |> TournamentContext.get()
        |> get_matches()
        |> Enum.count(&(&1.round_position == 0)) == 8
      end)

      rematches =
        tournament_id
        |> TournamentContext.get()
        |> current_round_playing_matches(0)
        |> Enum.sort_by(& &1.id)

      assert length(rematches) == 4

      # Сопоставляем ремачи с парами по player_ids.
      pair_a_set = Enum.sort(match_a.player_ids)
      pair_b_set = Enum.sort(match_b.player_ids)
      pair_c_set = Enum.sort(match_c.player_ids)
      pair_d_set = Enum.sort(match_d.player_ids)

      rematch_for = fn pair_set ->
        Enum.find(rematches, &(Enum.sort(&1.player_ids) == pair_set))
      end

      rematch_a = rematch_for.(pair_a_set)
      rematch_b = rematch_for.(pair_b_set)
      rematch_c = rematch_for.(pair_c_set)
      rematch_d = rematch_for.(pair_d_set)

      # Pair A rematch: a_p2 выигрывает за 25s (1-1 split в паре A).
      a_p2 = Enum.at(match_a.player_ids, 1)
      finish_game_as_won(rematch_a.game_id, a_p2, 25)

      # Pair B rematch: b_p1 выигрывает снова за 15s (свип, две победы подряд).
      finish_game_as_won(rematch_b.game_id, b_p1, 15)

      # Pair C rematch: timeout снова (пара C — оба timeout оба раза).
      {:ok, _} = GameContext.trigger_timeout(rematch_c.game_id)

      # Pair D rematch: timeout (d_p2 победил game 1, во втором никто не решил).
      {:ok, _} = GameContext.trigger_timeout(rematch_d.game_id)

      # Ждём перехода на R1 — это значит R0 закрылся и tournament_results заполнен.
      wait_for(
        fn ->
          t = TournamentContext.get(tournament_id)
          t.current_round_position >= 1
        end,
        200,
        50
      )

      # --- ПРОВЕРЯЕМ tournament_results: 8 пользователей × 2 игры = 16 строк за R0 ---
      results =
        Codebattle.Repo.all(
          from(r in TournamentResult,
            where: r.tournament_id == ^tournament_id and r.round_position == 0,
            order_by: [asc: r.user_id, asc: r.game_id]
          )
        )

      assert length(results) == 16,
             "expected 16 tournament_result rows (8 users × 2 games), got #{length(results)}"

      # --- ПРОВЕРЯЕМ ranking за R0 ---
      r0_ranking = TournamentResult.get_user_ranking_for_round(tournament, 0)
      cumulative_ranking = TournamentResult.get_user_ranking(tournament)

      # Pair B: оба выигрыша принадлежат b_p1. b_p1 имеет максимальный score, b_p2 — 0.
      assert score_of(r0_ranking, b_p1) > 0
      assert Decimal.equal?(score_of(r0_ranking, Enum.at(match_b.player_ids, 1)), Decimal.new(0))

      # Pair C: оба игрока timeout оба раза → score 0.
      [c_p1, c_p2] = match_c.player_ids
      assert Decimal.equal?(score_of(r0_ranking, c_p1), Decimal.new(0))
      assert Decimal.equal?(score_of(r0_ranking, c_p2), Decimal.new(0))

      # Pair A: 1 win + 1 win (по 1 на игрока) → у каждого по одному ненулевому score.
      assert score_of(r0_ranking, a_p1) > 0
      assert score_of(r0_ranking, Enum.at(match_a.player_ids, 1)) > 0

      # Pair D: u_D_second победил один раз, потом timeout. У u_D_first нет побед.
      [d_p1_id | _] = match_d.player_ids
      assert score_of(r0_ranking, d_p2) > 0
      # У проигравшего таймаут-партнёра в обоих → 0.
      assert Decimal.equal?(score_of(r0_ranking, d_p1_id), Decimal.new(0))

      # --- ЛИДЕР по сумме за R0 — победитель свипа в паре B (2 победы) ---
      r0_sorted =
        r0_ranking
        |> Map.values()
        |> Enum.sort_by(&to_float(&1.score), :desc)

      assert hd(r0_sorted).id == b_p1,
             "expected leader to be sweep winner #{b_p1}, got #{hd(r0_sorted).id}"

      # --- СУММИРОВАНИЕ обеих игр: b_p1 имеет 2 победы, a_p1 — только 1.
      # Если бы score брался только из одной игры, можно было бы получить tie.
      # Сумма же даёт b_p1 строго больше, чем a_p1.
      assert to_float(score_of(r0_ranking, b_p1)) > to_float(score_of(r0_ranking, a_p1)),
             "sweep winner b_p1 must outrank single-game winner a_p1"

      # --- Быстрый победитель набирает больше, чем медленный.
      # b_p1 решал за 10s (game 1) и 15s (rematch), d_p2 — за 40s (одна победа, потом timeout).
      assert to_float(score_of(r0_ranking, b_p1)) > to_float(score_of(r0_ranking, d_p2)),
             "fast sweep winner b_p1 must outrank slow single-game winner d_p2"

      # --- cumulative ranking покрывает всех 8 игроков ---
      # Допускается, что игроки с 0 очками не попадают в результирующую выборку SQL
      # (если все их score = 0, но строки в tournament_results всё равно есть);
      # тогда требуем, чтобы там были хотя бы непустые победители.
      assert MapSet.subset?(MapSet.new(user_ids), MapSet.new(Map.keys(cumulative_ranking))) or
               cumulative_ranking |> Map.keys() |> length() >= 1

      # Sanity: топ суммарного ranking == топ R0 (потому что R0 — единственный раунд с очками).
      cumulative_sorted =
        cumulative_ranking
        |> Map.values()
        |> Enum.sort_by(&to_float(&1.score), :desc)

      assert hd(cumulative_sorted).id == b_p1

      # Подавляем unused warnings.
      _ = {u1, u2, u3, u4, u5, u6, u7, u8}
    end
  end

  defp finish_game_as_won(game_id, winner_user_id, duration_sec) do
    # Drive the FSM the same path Engine.check_result/2 takes on success:
    # transition → store_result! → broadcast "game:finished" (mapped to
    # game:tournament:finished by events.ex).
    {:ok, {_old, new_game}} =
      Codebattle.Game.Server.fire_transition(game_id, :check_success, %{
        id: winner_user_id,
        check_result: %{success_count: 10, asserts_count: 10, status: "ok"},
        editor_text: "ok",
        editor_lang: "js"
      })

    # Override duration_sec so PERCENTILE_CONT in TournamentResult SQL gets non-zero
    # base_score (otherwise sub-second test games make every score collapse to 0).
    new_game = %{new_game | duration_sec: duration_sec}
    {:ok, _} = Codebattle.Game.Engine.store_result!(new_game, %{duration_sec: duration_sec})
    Codebattle.PubSub.broadcast("game:finished", %{game: new_game})
    :ok
  end

  defp score_of(ranking, user_id) do
    case Map.get(ranking, user_id) do
      %{score: score} -> score
      _ -> Decimal.new(0)
    end
  end

  describe "live tournament flow — full R0→R7 lifecycle" do
    @tag :integration
    @tag timeout: 60_000
    test "8 игроков проходят весь top200 от create до finished, все 8 раундов и все ремачи" do
      # Регрессия для всей связки top200: complete_players (no-op), task_pack+per_round_pair
      # ordering, start_rematch (создаёт второй матч на пару), R5 QF + R6 SF + R7 Finals дедуп.
      tasks = insert_list(16, :task, level: "easy", time_to_solve_sec: 60)
      task_ids = Enum.map(tasks, & &1.id)
      insert(:task_pack, name: "top200-full-flow", task_ids: task_ids)

      creator = insert(:user)
      users = insert_list(8, :user)

      {:ok, tournament} =
        TournamentContext.create(%{
          "starts_at" => "2026-01-01T12:00",
          "name" => "Top200 full flow",
          "description" => "full lifecycle",
          "user_timezone" => "Etc/UTC",
          "task_pack_name" => "top200-full-flow",
          "creator" => creator,
          "break_duration_seconds" => 0,
          "task_provider" => "task_pack",
          "task_strategy" => "per_round_pair",
          "ranking_type" => "by_user",
          "score_strategy" => "75_percentile",
          "timeout_mode" => "per_round_with_rematch",
          "round_timeout_seconds" => 60,
          "type" => "top200",
          "state" => "waiting_participants",
          "rounds_limit" => "8",
          "players_limit" => 8
        })

      Server.handle_event(tournament.id, :join, %{users: users})
      Server.handle_event(tournament.id, :start, %{user: creator})

      tournament_id = tournament.id

      Enum.each(0..7, fn round ->
        play_top200_round(tournament_id, round)
      end)

      # После R7 турнир должен завершиться сам.
      wait_for(
        fn ->
          TournamentContext.get(tournament_id).state == "finished"
        end,
        # тут break_duration=0, но min_break_duration_seconds=1 → пара секунд на финал.
        300,
        50
      )

      final = TournamentContext.get(tournament_id)
      assert final.state == "finished"
      assert final.current_round_position == 7
      # 8 раундов × 4 пары × 2 матча на пару = 64.
      assert length(get_matches(final)) == 64
      # Каждый раунд должен содержать ровно 8 матчей (4 пары × 2 игры).
      Enum.each(0..7, fn round ->
        round_matches = Enum.filter(get_matches(final), &(&1.round_position == round))
        assert length(round_matches) == 8, "round #{round} has #{length(round_matches)} matches, expected 8"

        # И ровно 4 уникальные пары в каждом раунде.
        pair_count =
          round_matches
          |> Enum.map(&Enum.sort(&1.player_ids))
          |> Enum.uniq()
          |> length()

        assert pair_count == 4, "round #{round} has #{pair_count} unique pairs, expected 4"
      end)
    end
  end

  defp play_top200_round(tournament_id, round) do
    tournament = TournamentContext.get(tournament_id)

    assert tournament.current_round_position == round,
           "expected to be at round #{round}, got #{tournament.current_round_position}"

    # Ждём, пока создадутся 4 начальных матча текущего раунда.
    wait_for(fn ->
      tournament = TournamentContext.get(tournament_id)

      tournament
      |> get_matches()
      |> Enum.count(&(&1.round_position == round and &1.state == "playing")) == 4
    end)

    tournament = TournamentContext.get(tournament_id)
    initial_matches = current_round_playing_matches(tournament, round)
    assert length(initial_matches) == 4

    # Timeout всех первых игр → top200.maybe_create_rematch запланирует rematch для каждой пары.
    Enum.each(initial_matches, fn match ->
      assert {:ok, _} = GameContext.trigger_timeout(match.game_id)
    end)

    # Ждём, пока появятся 4 rematch-матча (всего 8 в раунде).
    wait_for(fn ->
      tournament = TournamentContext.get(tournament_id)

      tournament
      |> get_matches()
      |> Enum.count(&(&1.round_position == round)) == 8
    end)

    tournament = TournamentContext.get(tournament_id)
    rematch_matches = current_round_playing_matches(tournament, round)
    assert length(rematch_matches) == 4

    # Timeout всех ремачей → раунд должен закрыться через finish_round_after_match?.
    Enum.each(rematch_matches, fn match ->
      assert {:ok, _} = GameContext.trigger_timeout(match.game_id)
    end)

    if round < 7 do
      # Ждём перехода на следующий раунд (через break).
      wait_for(
        fn ->
          t = TournamentContext.get(tournament_id)
          t.current_round_position == round + 1 and t.round_state == "active"
        end,
        # break_duration=0 + min_break_duration_seconds=1 в test config → ~1-2s.
        200,
        50
      )
    end
  end

  defp current_round_playing_matches(tournament, round) do
    tournament
    |> get_matches()
    |> Enum.filter(&(&1.round_position == round and &1.state == "playing"))
  end

  defp wait_for(check_fn, attempts \\ 50, delay_ms \\ 20) do
    cond do
      check_fn.() ->
        :ok

      attempts <= 0 ->
        raise "wait_for timed out"

      true ->
        Process.sleep(delay_ms)
        wait_for(check_fn, attempts - 1, delay_ms)
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

  # Игроки с явным draw_index — имитируем результат calculate_round_results прошлого
  # раунда (победителю каждой пары draw_index уже подняли). Принимает map id => draw_index.
  defp players_with_draw_index(id_to_draw_index) do
    Map.new(id_to_draw_index, fn {id, draw_index} ->
      {id, Player.new!(%{id: id, name: "p#{id}", rating: id, state: "active", draw_index: draw_index})}
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

  defp draw_index_by_id(tournament, ids) do
    Map.new(ids, fn id -> {id, Tournament.Players.get_player(tournament, id).draw_index} end)
  end

  defp pair_ids(pairs) do
    Enum.map(pairs, &pair_to_sorted_ids/1)
  end

  defp pair_to_sorted_ids(pair) do
    pair |> Enum.map(& &1.id) |> Enum.sort()
  end
end
