defmodule Codebattle.Tournament.Base do
  # credo:disable-for-this-file Credo.Check.Refactor.LongQuoteBlocks

  alias Codebattle.Game
  alias Codebattle.Tournament

  @moduledoc """
  Defines interface for tournament type
  """
  @callback build_round_pairs(Tournament.t()) :: {Tournament.t(), list(list(pos_integer()))}
  @callback calculate_round_results(Tournament.t()) :: Tournament.t()
  @callback complete_players(Tournament.t()) :: Tournament.t()
  @callback finish_tournament?(Tournament.t()) :: boolean()
  @callback default_meta() :: map()

  defmacro __using__(_opts) do
    quote location: :keep do
      @behaviour Tournament.Base
      import Tournament.Helpers

      def add_player(tournament, player) do
        Tournament.Players.put_player(tournament, Tournament.Player.new!(player))
        Map.put(tournament, :players_count, players_count(tournament))
      end

      def add_players(tournament, %{users: users}) do
        Enum.reduce(users, tournament, &add_player(&2, &1))
      end

      def join(tournament = %{state: "waiting_participants"}, params = %{users: users}) do
        player_params = Map.drop(params, [:users])
        Enum.reduce(users, tournament, &join(&2, Map.put(player_params, :user, &1)))
      end

      def join(tournament = %{state: "waiting_participants"}, params) do
        player =
          params.user
          |> Map.put(:lang, params.user.lang || tournament.default_language)
          |> Map.put(:team_id, Map.get(params, :team_id))

        if players_count(tournament) < tournament.players_limit do
          add_player(tournament, player)
        else
          tournament
        end
      end

      def join(tournament, _), do: tournament

      def leave(tournament, %{user: user}) do
        leave(tournament, %{user_id: user.id})
      end

      def leave(tournament, %{user_id: user_id}) do
        Tournament.Players.drop_player(tournament, user_id)
        tournament
      end

      def leave(tournament, _user_id), do: tournament

      def open_up(tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          update_struct(tournament, %{access_type: "public"})
        else
          tournament
        end
      end

      def cancel(tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          new_tournament = tournament |> update_struct(%{state: "canceled"}) |> db_save!()

          Tournament.GlobalSupervisor.terminate_tournament(tournament.id)

          new_tournament
        else
          tournament
        end
      end

      def restart(tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          tournament
          |> update_struct(%{
            players: %{},
            meta: default_meta(),
            matches: %{},
            break_state: "off",
            players_count: 0,
            current_round: 0,
            last_round_ended_at: nil,
            last_round_started_at: nil,
            winner_ids: [],
            top_player_ids: [],
            starts_at: DateTime.utc_now(:second) |> DateTime.add(5 * 60, :second),
            state: "waiting_participants"
          })
        else
          tournament
        end
      end

      def restart(tournament, _user), do: tournament

      def start(tournament = %{state: "waiting_participants"}, %{user: user}) do
        if can_moderate?(tournament, user) do
          tournament =
            tournament
            |> complete_players()

          tournament
          |> update_struct(%{
            players_count: players_count(tournament),
            state: "active"
          })
          |> broadcast_tournament_started()
          |> start_round()
        else
          tournament
        end
      end

      def start(tournament, _params), do: tournament

      def stop_round_break(tournament) do
        tournament
        |> increment_current_round()
        |> start_round()
      end

      def handle_game_result(tournament, params) do
        match = get_match(tournament, params.ref)
        winner_id = pick_game_winner_id(match.player_ids, params.player_results)

        Tournament.Matches.put_match(tournament, %{
          match
          | state: params.game_state,
            winner_id: winner_id,
            player_results: params.player_results
        })

        params.player_results
        |> Map.keys()
        |> Enum.each(fn player_id ->
          player = Tournament.Players.get_player(tournament, player_id)

          if player do
            Tournament.Players.put_player(tournament, %{
              player
              | score: player.score + params.player_results[player_id].score,
                lang: params.player_results[player_id].lang,
                wins_count:
                  player.wins_count +
                    if(params.player_results[player_id].result == "won", do: 1, else: 0)
            })
          end
        end)

        tournament
      end

      def finish_match(tournament, params) do
        tournament
        |> handle_game_result(params)
        |> maybe_start_rematch_async(params)
        |> maybe_finish_round()
      end

      def maybe_finish_round(tournament) do
        if round_ends_by_time?(tournament) or
             Enum.any?(get_matches(tournament), &(&1.state == "playing")) do
          tournament
        else
          do_finish_round_and_next_step(tournament)
        end
      end

      def finish_round(tournament) do
        matches_to_finish = get_matches(tournament, "playing")

        Enum.each(
          matches_to_finish,
          fn match ->
            player_results =
              case Game.Context.fetch_game(match.game_id) do
                {:ok, game} -> Game.Helpers.get_player_results(game)
                {:error, _reason} -> %{}
              end

            Game.Context.trigger_timeout(match.game_id)

            Tournament.Matches.put_match(tournament, %{
              match
              | state: "timeout",
                player_results: player_results
            })

            player_results
            |> Map.keys()
            |> Enum.each(fn player_id ->
              player = Tournament.Players.get_player(tournament, player_id)

              Tournament.Players.put_player(tournament, %{
                player
                | score: player.score + player_results[player_id].score,
                  lang: player_results[player_id].lang
              })
            end)
          end
        )

        do_finish_round_and_next_step(tournament)
      end

      def do_finish_round_and_next_step(tournament) do
        tournament
        |> update_struct(%{last_round_ended_at: NaiveDateTime.utc_now(:second)})
        |> calculate_round_results()
        |> broadcast_round_finished()
        |> maybe_finish_tournament()
        |> start_round_or_break_or_finish()
      end

      defp maybe_start_rematch_async(tournament, params) do
        timeout_ms = Application.get_env(:codebattle, :tournament_rematch_timeout_ms)

        min_seconds_to_rematch = 7 + round(timeout_ms / 1000)

        if round_ends_by_time?(tournament) do
          wait_type =
            if seconds_to_end_round(tournament) > min_seconds_to_rematch do
              Process.send_after(
                self(),
                {:start_rematch, params.ref, tournament.current_round},
                timeout_ms
              )

              dbg(timeout_ms)

              "rematch"
            else
              "round"
            end

          Codebattle.PubSub.broadcast("tournament:game:wait", %{
            game_id: params.game_id,
            type: wait_type
          })
        end

        tournament
      end

      def start_rematch(tournament, match_ref) do
        finished_match = get_match(tournament, match_ref)
        new_match_id = matches_count(tournament)
        player_ids = finished_match.player_ids

        build_and_run_match(tournament, {get_players(tournament, player_ids), new_match_id})
      end

      defp pick_game_winner_id(player_ids, player_results) do
        Enum.find(player_ids, &(player_results[&1] && player_results[&1].result == "won"))
      end

      defp start_round_or_break_or_finish(tournament = %{state: "finished"}) do
        tournament
      end

      defp start_round_or_break_or_finish(tournament = %{use_infinite_break: true}) do
        update_struct(tournament, %{break_state: "on"})
      end

      defp start_round_or_break_or_finish(
             tournament = %{
               state: "active",
               break_duration_seconds: break_duration_seconds
             }
           )
           when break_duration_seconds not in [nil, 0] do
        Process.send_after(
          self(),
          {:stop_round_break, tournament.current_round},
          :timer.seconds(tournament.break_duration_seconds)
        )

        update_struct(tournament, %{break_state: "on"})
      end

      defp start_round_or_break_or_finish(tournament) do
        tournament
        |> increment_current_round()
        |> start_round()
      end

      defp increment_current_round(tournament) do
        update_struct(tournament, %{current_round: tournament.current_round + 1})
      end

      defp start_round(tournament) do
        tournament
        |> update_struct(%{
          break_state: "off",
          last_round_started_at: NaiveDateTime.utc_now(:second)
        })
        |> start_round_timer()
        |> maybe_set_task_for_round()
        |> build_round_matches()
        |> db_save!()
        |> broadcast_round_created()
      end

      defp build_round_matches(tournament) do
        tournament
        |> build_round_pairs()
        |> build_and_run_matches()
      end

      defp build_and_run_matches({tournament, player_pairs}) do
        player_pairs
        |> Enum.with_index(matches_count(tournament))
        |> Enum.each(fn
          {[p1 = %{is_bot: true}, p2 = %{is_bot: true}], match_id} ->
            Tournament.Matches.put_match(tournament, %Tournament.Match{
              id: match_id,
              state: "canceled",
              round: tournament.current_round,
              player_ids: Enum.sort([p1.id, p2.id])
            })

          {[p1, p2], match_id} ->
            build_and_run_match(tournament, {[p1, p2], match_id})
        end)

        tournament
      end

      defp build_and_run_match(tournament, {[p1, p2], match_id}) do
        {game_id, task_id} = create_game(tournament, match_id, [p1, p2])

        match = %Tournament.Match{
          id: match_id,
          game_id: game_id,
          state: "playing",
          player_ids: Enum.sort([p1.id, p2.id]),
          round: tournament.current_round
        }

        Tournament.Matches.put_match(tournament, match)

        Tournament.Players.put_player(tournament, %{
          p1
          | matches_ids: [match_id | p1.matches_ids],
            task_ids: [task_id | p1.task_ids]
        })

        Tournament.Players.put_player(tournament, %{
          p2
          | matches_ids: [match_id | p2.matches_ids],
            task_ids: [task_id | p2.task_ids]
        })

        Codebattle.PubSub.broadcast("tournament:match:upserted", %{
          tournament: tournament,
          match: match
        })

        tournament
      end

      defp create_game(tournament, ref, players) do
        game_timeout =
          if round_ends_by_time?(tournament) do
            seconds_to_end_round(tournament)
          else
            tournament.match_timeout_seconds
          end

        {:ok, game} =
          Game.Context.create_game(%{
            state: "playing",
            task: get_current_round_task(tournament),
            ref: ref,
            level: tournament.level,
            tournament_id: tournament.id,
            timeout_seconds: game_timeout,
            use_chat: tournament.use_chat,
            players: players
          })

        {game.id, game.task_id}
      end

      def update_struct(tournament, params) do
        Map.merge(tournament, params)
      end

      def db_save!(tournament), do: Tournament.Context.upsert!(tournament)

      defp maybe_finish_tournament(tournament) do
        if finish_tournament?(tournament) do
          tournament
          |> update_struct(%{state: "finished", finished_at: TimeHelper.utc_now()})
          |> set_stats()
          |> set_winner_ids()
          |> db_save!()
          |> broadcast_tournament_finished()

          # TODO: implement tournament termination in 15 mins
          # Tournament.GlobalSupervisor.terminate_tournament(tournament.id, 15 mins)
        else
          tournament
        end
      end

      defp set_stats(tournament) do
        update_struct(tournament, %{stats: get_stats(tournament)})
      end

      defp set_winner_ids(tournament) do
        update_struct(tournament, %{winner_ids: get_winner_ids(tournament)})
      end

      defp start_round_timer(tournament) do
        Process.send_after(
          self(),
          {:finish_round_force, tournament.current_round},
          :timer.seconds(tournament.match_timeout_seconds)
        )

        tournament
      end

      defp maybe_set_task_for_round(tournament = %{task_strategy: "round"}) do
        %{
          tournament
          | round_tasks:
              Map.put(
                tournament.round_tasks,
                to_id(tournament.current_round),
                get_task(tournament)
              )
        }
      end

      defp maybe_set_task_for_round(t), do: t

      defp get_task(tournament = %{task_provider: "task_pack"}) do
        # TODO: implement task_pack as a task provider
        Codebattle.Task.get_task_by_level(tournament.level)
      end

      defp get_task(tournament = %{task_provider: "tags"}) do
        # TODO: implement task_queue server by tags, fallback to level
        Codebattle.Task.get_task_by_level(tournament.level)
      end

      defp get_task(tournament = %{task_provider: "level"}) do
        Codebattle.Task.get_task_by_level(tournament.level)
      end

      defp broadcast_round_created(tournament) do
        Codebattle.PubSub.broadcast("tournament:round_created", %{tournament: tournament})
        tournament
      end

      defp broadcast_round_finished(tournament) do
        Codebattle.PubSub.broadcast("tournament:round_finished", %{tournament: tournament})
        tournament
      end

      defp broadcast_tournament_started(tournament) do
        Codebattle.PubSub.broadcast("tournament:started", %{tournament: tournament})
        tournament
      end

      defp broadcast_tournament_finished(tournament) do
        Codebattle.PubSub.broadcast("tournament:finished", %{tournament_id: tournament.id})
        tournament
      end

      defp round_ends_by_time?(%{type: "swiss"}), do: true
      defp round_ends_by_time?(_), do: false

      defp seconds_to_end_round(tournament) do
        tournament.match_timeout_seconds -
          NaiveDateTime.diff(NaiveDateTime.utc_now(), tournament.last_round_started_at)
      end
    end
  end
end

# Create an ETS table with a set
:ets.new(:my_table, [:set, :named_table])

# Insert some data into the table
:ets.insert(:my_table, {:john, 25})
:ets.insert(:my_table, {:jane, 30})
:ets.insert(:my_table, {:bob, 22})
:ets.insert(:my_table, {:alice, 28})

# Count the number of elements in the table where age is greater than 25
count = :ets.select_count(:my_table, [{:_, [], [:_, :_]}])

:ets.select_count(:my_table, [{:_, [], [true]}])

IO.puts("Number of elements with age greater than 25: #{count}")
