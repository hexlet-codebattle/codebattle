defmodule Codebattle.Tournament.Base do
  # credo:disable-for-this-file Credo.Check.Refactor.LongQuoteBlocks

  alias Codebattle.Game
  alias Codebattle.Tournament
  alias Codebattle.TaskPack

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
        Map.put(tournament, :players_count, players_count(tournament))
      end

      def leave(tournament, _user_id), do: tournament

      def open_up(tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          update_struct(tournament, %{access_type: "public"})
        else
          tournament
        end
      end

      def toggle_show_results(tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          update_struct(
            tournament,
            %{show_results: !Map.get(tournament, :show_results, true)}
          )
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

      def finish_match(tournament, params) do
        tournament
        |> handle_game_result(params)
        |> maybe_start_rematch_async(params)
        |> maybe_finish_round()
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

      defp maybe_start_rematch_async(tournament, params) do
        if round_ends_by_time?(tournament) do
          timeout_ms = Application.get_env(:codebattle, :tournament_rematch_timeout_ms)
          wait_type = get_wait_type(tournament, timeout_ms)

          if wait_type == "rematch" do
            Process.send_after(
              self(),
              {:start_rematch, params.ref, tournament.current_round},
              timeout_ms
            )
          end

          Codebattle.PubSub.broadcast("tournament:game:wait", %{
            game_id: params.game_id,
            type: wait_type
          })
        end

        tournament
      end

      defp get_wait_type(tournament, timeout_ms) do
        min_seconds_to_rematch = 7 + round(timeout_ms / 1000)

        if seconds_to_end_round(tournament) > min_seconds_to_rematch do
          "rematch"
        else
          if finish_tournament?(tournament) do
            "tournament"
          else
            "round"
          end
        end
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

            match = Tournament.Matches.get_match(tournament, match.id)

            Codebattle.PubSub.broadcast("tournament:match:upserted", %{
              tournament: tournament,
              match: match
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
        |> update_struct(%{
          last_round_ended_at: NaiveDateTime.utc_now(:second),
          show_results: !finish_tournament?(tournament)
        })
        |> calculate_round_results()
        |> broadcast_round_finished()
        |> maybe_finish_tournament()
        |> start_round_or_break_or_finish()
        |> then(fn tournament ->
          broadcast_tournament_update(tournament)
          tournament
        end)
      end

      def start_rematch(tournament, match_ref) do
        finished_match = get_match(tournament, match_ref)
        new_match_id = matches_count(tournament)
        players = get_players(tournament, finished_match.player_ids)

        case create_rematch_game(tournament, players, new_match_id) do
          nil ->
            # TODO: send message that there is no tasks in task_pack
            nil

          game ->
            build_and_run_match(tournament, players, game)
        end

        tournament
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
        |> maybe_preload_tasks()
        |> start_round_timer()
        |> build_round_matches()
        |> db_save!()
        |> broadcast_round_created()
      end

      defp build_round_matches(tournament) do
        tournament
        |> build_round_pairs()
        |> bulk_insert_round_games()
      end

      defp bulk_insert_round_games({tournament, player_pairs}) do
        task_ids = get_round_task_ids(tournament)

        player_pairs
        |> Enum.with_index(matches_count(tournament))
        |> Enum.chunk_every(20)
        |> Enum.each(&bulk_create_games_and_matches(&1, tournament, task_ids))

        tournament
      end

      defp bulk_create_games_and_matches(batch, tournament, task_ids) do
        game_timeout = get_game_timeout(tournament)

        batch
        |> Enum.map(fn
          # TODO: only for load tests we want that bots play real games
          # {[p1 = %{is_bot: true}, p2 = %{is_bot: true}], match_id} ->
          #   Tournament.Matches.put_match(tournament, %Tournament.Match{
          #     id: match_id,
          #     state: "canceled",
          #     round: tournament.current_round,
          #     player_ids: Enum.sort([p1.id, p2.id])
          #   })

          {players = [p1, p2], match_id} ->
            %{
              state: "playing",
              task: Tournament.Tasks.get_task(tournament, Enum.random(task_ids)),
              ref: match_id,
              timeout_seconds: game_timeout,
              tournament_id: tournament.id,
              use_chat: tournament.use_chat,
              players: players
            }
        end)
        |> Game.Context.bulk_create_games()
        |> Enum.zip(batch)
        |> Enum.each(fn {game, {players, _match_id}} ->
          build_and_run_match(tournament, players, game)
        end)
      end

      defp create_rematch_game(tournament, players, ref) do
        case get_rematch_task(tournament, players) do
          nil ->
            nil

          task ->
            {:ok, game} =
              Game.Context.create_game(%{
                state: "playing",
                task: task,
                ref: ref,
                level: tournament.level,
                tournament_id: tournament.id,
                timeout_seconds: get_game_timeout(tournament),
                use_chat: tournament.use_chat,
                players: players
              })

            game
        end
      end

      defp build_and_run_match(tournament, [p1, p2], game) do
        match = %Tournament.Match{
          id: game.ref,
          game_id: game.id,
          state: "playing",
          player_ids: Enum.sort([p1.id, p2.id]),
          round: tournament.current_round
        }

        Tournament.Matches.put_match(tournament, match)

        Tournament.Players.put_player(tournament, %{
          p1
          | matches_ids: [match.id | p1.matches_ids],
            task_ids: [game.task_id | p1.task_ids]
        })

        Tournament.Players.put_player(tournament, %{
          p2
          | matches_ids: [match.id | p2.matches_ids],
            task_ids: [game.task_id | p2.task_ids]
        })

        Codebattle.PubSub.broadcast("tournament:match:upserted", %{
          tournament: tournament,
          match: match
        })
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
          :timer.seconds(get_round_timeout_seconds(tournament))
        )

        tournament
      end

      defp get_rematch_task(tournament, players) do
        completed_task_ids = Enum.flat_map(players, & &1.task_ids)

        round_task_ids = Tournament.Tasks.get_task_ids(tournament)

        (round_task_ids -- completed_task_ids)
        |> case do
          [] -> nil
          ids -> Enum.random(ids)
        end
        |> case do
          nil -> nil
          task_id -> Tournament.Tasks.get_task(tournament, task_id)
        end
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
        Codebattle.PubSub.broadcast("tournament:finished", %{tournament: tournament})
        tournament
      end

      defp get_game_timeout(tournament) do
        if round_ends_by_time?(tournament) do
          seconds_to_end_round(tournament)
        else
          get_round_timeout_seconds(tournament)
        end
      end

      defp round_ends_by_time?(%{type: "swiss"}), do: true
      defp round_ends_by_time?(%{type: "ladder"}), do: true
      defp round_ends_by_time?(_), do: false

      defp seconds_to_end_round(tournament) do
        max(
          get_round_timeout_seconds(tournament) -
            NaiveDateTime.diff(NaiveDateTime.utc_now(), tournament.last_round_started_at),
          0
        )
      end

      defp get_round_timeout_seconds(
             tournament = %{
               meta: %{rounds_config_type: "per_round", rounds_config: rounds_config}
             }
           )
           when is_list(rounds_config) do
        rounds_config
        |> Enum.at(tournament.current_round, %{})
        |> Map.get(:round_timeout_seconds, 180)
      end

      defp get_round_timeout_seconds(tournament) do
        tournament.match_timeout_seconds
      end

      defp broadcast_tournament_update(tournament) do
        Codebattle.PubSub.broadcast("tournament:updated", %{tournament: tournament})
      end

      defp maybe_preload_tasks(
             tournament = %{
               meta: %{rounds_config_type: "per_round", rounds_config: rounds_config}
             }
           )
           when is_list(rounds_config) do
        round_tasks =
          rounds_config
          |> Enum.at(tournament.current_round, %{})
          |> Map.get(:task_pack_id)
          |> case do
            nil -> []
            id -> TaskPack.get_tasks_by_pack_id(id)
          end
          |> Enum.shuffle()

        Tournament.Tasks.replace_tasks(tournament, round_tasks)

        tournament
      end

      defp maybe_preload_tasks(
             tournament = %{current_round: 0, meta: %{rounds_config_type: "all"}}
           ) do
        tasks = Codebattle.Task.get_tasks_by_level(tournament.level) |> Enum.shuffle()

        Tournament.Tasks.put_tasks(tournament, tasks)

        tournament
      end

      defp maybe_preload_tasks(tournament), do: tournament

      defp get_round_task_ids(tournament = %{meta: %{rounds_config_type: "per_round"}}) do
        Tournament.Tasks.get_task_ids(tournament)
      end

      defp get_round_task_ids(tournament) do
        Tournament.Tasks.get_task_ids(tournament)
        # TODO: implement reshuffle after all tasks used
        # completed_task_ids =
        #   Tournament.Players.get_players()
        #   |> Enum.flat_map(& &1.task_ids)

        # round_task_ids = Tournament.Tasks.get_task_ids(tournament)

        # round_task_ids -- completed_task_ids
      end
    end
  end
end
