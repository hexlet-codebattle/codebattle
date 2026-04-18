defmodule Codebattle.Tournament.Base do
  # credo:disable-for-this-file Credo.Check.Refactor.LongQuoteBlocks
  @moduledoc """
  Defines interface for tournament type
  """

  alias Codebattle.Event
  alias Codebattle.Game
  alias Codebattle.Tournament
  alias Codebattle.UserGameReport

  @callback build_round_pairs(Tournament.t()) :: {Tournament.t(), list(list(pos_integer()))}
  @callback calculate_round_results(Tournament.t()) :: Tournament.t()
  @callback complete_players(Tournament.t()) :: Tournament.t()
  @callback maybe_create_rematch(Tournament.t(), map()) :: Tournament.t()
  @callback finish_tournament?(Tournament.t()) :: boolean()
  @callback finish_round_after_match?(Tournament.t()) :: boolean()
  @callback reset_meta(map()) :: map()
  @callback game_type() :: String.t()

  defmacro __using__(_opts) do
    quote location: :keep do
      @behaviour Tournament.Base

      import Tournament.Helpers
      import Tournament.TaskProvider

      alias Codebattle.Bot
      alias Tournament.Round.Context
      alias Tournament.Storage.Ranking

      require Logger

      def add_player(tournament, player) do
        tournament_player = Tournament.Player.new!(player)
        Tournament.Players.put_player(tournament, tournament_player)

        Tournament.Ranking.add_new_player(tournament, tournament_player)

        if tournament.use_clan do
          Tournament.Clans.add_players_clan(tournament, tournament_player)
        end

        Map.put(tournament, :players_count, players_count(tournament))
      end

      def add_players(tournament, %{users: users}) do
        Enum.reduce(users, tournament, &add_player(&2, &1))
      end

      defp maybe_add_player_clan(tournament, player) do
        if tournament.use_clan do
          Tournament.Clans.add_players_clan(tournament, player)
        end
      end

      def join(%{state: "waiting_participants"} = tournament, %{users: users} = params) do
        player_params = Map.delete(params, :users)
        Enum.reduce(users, tournament, &join(&2, Map.put(player_params, :user, &1)))
      end

      def join(%{state: "waiting_participants"} = tournament, params) do
        player = Map.put(params.user, :lang, params.user.lang)

        if player?(tournament, player.id) or players_count(tournament) >= tournament.players_limit do
          tournament
        else
          tournament
          |> add_player(player)
          |> db_save!(:with_ets)
        end
      end

      def join(%{state: "active", type: "swiss"} = tournament, params) do
        player = Map.put(params.user, :lang, params.user.lang)

        if player?(tournament, player.id) or players_count(tournament) >= tournament.players_limit do
          tournament
        else
          tournament
          |> add_player(player)
          |> db_save!(:with_ets)
        end
      end

      def join(tournament, _), do: tournament

      def leave(tournament, %{user: user}) do
        leave(tournament, %{user_id: user.id})
      end

      def leave(tournament, %{user_id: user_id}) do
        Tournament.Players.drop_player(tournament, user_id)
        Tournament.Ranking.drop_player(tournament, user_id)

        tournament
        |> Map.put(:players_count, players_count(tournament))
        |> db_save!(:with_ets)
      end

      def leave(tournament, _user_id), do: tournament

      def matchmaking_restart(tournament, %{user_id: user_id}) do
        player = Tournament.Players.get_player(tournament, user_id)

        if player.state in ["matchmaking_active", "active", "matchmaking_paused"] do
          new_player = %{
            player
            | state: "matchmaking_active",
              wr_joined_at: :os.system_time(:second)
          }

          Tournament.Players.put_player(tournament, new_player)

          Codebattle.PubSub.broadcast("tournament:player:matchmaking_started", %{
            tournament: tournament,
            player: new_player
          })
        end

        tournament
      end

      def matchmaking_pause(tournament, %{user_id: user_id}) do
        player = Tournament.Players.get_player(tournament, user_id)

        if player.state in ["matchmaking_active", "finished_round"] do
          new_player = %{player | state: "matchmaking_paused"}
          Tournament.Players.put_player(tournament, new_player)

          Codebattle.PubSub.broadcast("tournament:player:matchmaking_paused", %{
            tournament: tournament,
            player: new_player
          })
        end

        tournament
      end

      # def matchmaking_resume(tournament, %{user_id: user_id}) do
      #   player = Tournament.Players.get_player(tournament, user_id)

      #   cond do
      #     player.state == "matchmaking_paused" &&
      #       tournament.break_state == "off" &&
      #         !player_finished_round?(tournament, player) ->
      #       new_player = %{
      #         player
      #         | state: "matchmaking_active",
      #           wr_joined_at: :os.system_time(:second)
      #       }

      #       Tournament.Players.put_player(tournament, new_player)

      #       Codebattle.PubSub.broadcast("tournament:player:matchmaking_resumed", %{
      #         tournament: tournament,
      #         player: new_player
      #       })

      #     player.state == "matchmaking_paused" ->
      #       new_player = %{player | state: "finished_round"}
      #       Tournament.Players.put_player(tournament, new_player)

      #       Codebattle.PubSub.broadcast("tournament:player:finished_round", %{
      #         tournament: tournament,
      #         player: new_player
      #       })

      #     true ->
      #       :noop
      #   end

      #   tournament
      # end

      def ban_player(tournament, player, game_ids) do
        if player do
          new_player = %{player | state: "banned"}
          cheater_ids = Enum.uniq([player.id | tournament.cheater_ids || []])
          new_tournament = update_struct(tournament, %{cheater_ids: cheater_ids})

          Tournament.Players.put_player(new_tournament, new_player)
          UserGameReport.mark_as_confirmed(new_tournament.id, player.id)

          Codebattle.PubSub.broadcast("tournament:player:banned", %{
            tournament: new_tournament,
            player: new_player,
            game_ids: game_ids
          })

          new_tournament |> db_save!(:with_ets) |> tap(&broadcast_tournament_update/1)
        else
          tournament
        end
      end

      def unban_player(tournament, player, game_ids) do
        new_state =
          if tournament.state == "finished" do
            "finished"
          else
            "active"
          end

        new_player = %{player | state: new_state}
        cheater_ids = List.delete(tournament.cheater_ids || [], player.id)
        new_tournament = update_struct(tournament, %{cheater_ids: cheater_ids})
        Tournament.Players.put_player(new_tournament, new_player)

        Codebattle.PubSub.broadcast("tournament:player:unbanned", %{
          tournament: new_tournament,
          player: new_player,
          game_ids: game_ids
        })

        new_tournament |> db_save!(:with_ets) |> tap(&broadcast_tournament_update/1)
      end

      def toggle_ban_player(tournament, %{user_id: user_id}) do
        toggle_cheater_player(tournament, %{user_id: user_id})
      end

      def toggle_cheater_player(tournament, %{user_id: user_id}) do
        player = Tournament.Players.get_player(tournament, user_id)

        if player do
          game_id = get_active_game_id(tournament, user_id)

          if game_id do
            Game.Context.toggle_ban_player(game_id, %{player_id: user_id})
          end

          if player.state == "banned" do
            unban_player(tournament, player, [game_id])
          else
            ban_player(tournament, player, [game_id])
          end
        else
          tournament
        end
      end

      def recalculate_results(tournament, params \\ %{})

      def recalculate_results(%{state: "finished"} = tournament, _params) do
        tournament
        |> reset_player_scores()
        |> rebuild_round_results()
        |> recalculate_player_wins_count()
        |> set_stats()
        |> upsert_tournament_user_results()
        |> sync_players_from_tournament_user_results()
        |> db_save!(:with_ets)
        |> tap(&broadcast_tournament_update/1)
      end

      def recalculate_results(tournament, _params), do: tournament

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

      def cancel(tournament, params \\ %{})

      def cancel(tournament, %{user: user} = params) do
        if can_moderate?(tournament, user) do
          cancel_tournament(tournament, params)
        else
          tournament
        end
      end

      def cancel(tournament, _params) do
        cancel_tournament(tournament)
      end

      defp cancel_tournament(tournament, params \\ %{}) do
        new_tournament = tournament |> update_struct(%{state: "canceled"}) |> db_save!()
        broadcast_tournament_canceled(new_tournament)

        Game.Context.terminate_tournament_games(tournament.id)
        Tournament.GlobalSupervisor.terminate_tournament(tournament.id)

        new_tournament
      end

      def restart(tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          Tournament.Round.disable_all_rounds(tournament.id)

          tournament
          |> update_struct(%{
            players: %{},
            meta: reset_meta(tournament.meta),
            matches: %{},
            break_state: "off",
            players_count: 0,
            current_round_position: 0,
            current_round: nil,
            current_round_id: nil,
            last_round_ended_at: nil,
            last_round_started_at: nil,
            finished_at: nil,
            started_at: nil,
            starts_at: :second |> DateTime.utc_now() |> DateTime.add(300, :second),
            winner_ids: [],
            top_player_ids: [],
            state: "waiting_participants"
          })
          |> db_save!()
          |> tap(&broadcast_tournament_update/1)
        else
          tournament
        end
      end

      def restart(tournament, _user), do: tournament

      def retry(tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          Tournament.Round.disable_all_rounds(tournament.id)

          players_for_retry = reset_players_for_retry(tournament)

          tournament =
            update_struct(tournament, %{
              meta: reset_meta(tournament.meta),
              matches: %{},
              break_state: "off",
              cheater_ids: [],
              players_count: 0,
              current_round_position: 0,
              current_round: nil,
              current_round_id: nil,
              last_round_ended_at: nil,
              last_round_started_at: nil,
              finished_at: nil,
              started_at: nil,
              starts_at: :second |> DateTime.utc_now() |> DateTime.add(300, :second),
              winner_ids: [],
              top_player_ids: [],
              state: "waiting_participants"
            })

          tournament = Enum.reduce(players_for_retry, tournament, &add_player(&2, &1))

          tournament
          |> db_save!(:with_ets)
          |> tap(&broadcast_tournament_update/1)
        else
          tournament
        end
      end

      def retry(tournament, _user), do: tournament

      def start(tournament, params \\ %{})

      def start(%{state: "waiting_participants"} = tournament, %{user: user} = params) do
        if can_moderate?(tournament, user) do
          start(tournament, Map.delete(params, :user))
        else
          tournament
        end
      end

      def start(%{state: "waiting_participants"} = tournament, params) do
        tournament = complete_players(tournament)

        tournament
        |> update_struct(%{
          players_count: players_count(tournament),
          round_op_id: nil,
          round_op_status: "idle",
          round_state: "active",
          started_at: DateTime.utc_now(:second),
          state: "active"
        })
        |> tap(&Tournament.TournamentResult.clean_results/1)
        |> Tournament.Ranking.set_ranking()
        |> maybe_start_global_timer()
        |> broadcast_tournament_started()
        |> start_round()
      end

      def start(tournament, _params), do: tournament

      def start_round_force(tournament, params \\ %{})

      def start_round_force(%{state: "finished"} = tournament, _new_round_params), do: tournament

      def start_round_force(tournament, new_round_params) do
        tournament
        |> increment_current_round()
        |> start_round(new_round_params)
      end

      def restore_active_round(tournament, params) do
        target_round_position = tournament.current_round_position

        tournament
        |> restore_previous_round_state(Map.get(params, :completed_round_position, target_round_position - 1))
        |> update_struct(%{
          break_state: "off",
          current_round_id: nil,
          current_round_position: target_round_position,
          played_pair_ids: Map.get(params, :played_pair_ids, MapSet.new()),
          round_op_id: nil,
          round_op_status: "idle",
          round_state: "active"
        })
        |> restore_round(params)
        |> db_save!(:with_ets)
        |> tap(&broadcast_tournament_update/1)
      end

      def restore_active_break(tournament, params) do
        target_round_position = tournament.current_round_position

        tournament
        |> restore_previous_round_state(Map.get(params, :completed_round_position, target_round_position))
        |> update_struct(%{
          break_state: "on",
          current_round_id: nil,
          current_round_position: target_round_position,
          played_pair_ids: Map.get(params, :played_pair_ids, MapSet.new()),
          round_op_id: nil,
          round_op_status: "done",
          round_state: "break"
        })
        |> db_save!(:with_ets)
        |> tap(&broadcast_tournament_update/1)
      end

      def finish_match(%{state: "timeout"} = tournament, params) do
        handle_game_result(tournament, params)
      end

      def finish_match(tournament, params) do
        tournament
        |> handle_game_result(params)
        |> maybe_create_rematch(params)
      end

      def handle_game_result(tournament, params) do
        case get_match(tournament, params.ref) do
          %{state: "playing"} = match ->
            winner_id = pick_game_winner_id(match.player_ids, params.player_results)

            params.player_results
            |> Map.keys()
            |> Enum.each(fn player_id ->
              maybe_update_player_result(tournament, player_id, params.player_results[player_id])
            end)

            new_match = %{
              match
              | state: params.game_state,
                winner_id: winner_id,
                duration_sec: params.duration_sec,
                player_results: params.player_results,
                finished_at: DateTime.utc_now(:second)
            }

            Tournament.Matches.put_match(tournament, new_match)

            if tournament.state != "timeout" do
              Codebattle.PubSub.broadcast("tournament:match:upserted", %{
                tournament: tournament,
                match: new_match
              })
            end

            tournament

          _match ->
            tournament
        end
      end

      def game_over_match(tournament, params) do
        Tournament.Matches.update_match(tournament, params.match_id, %{state: "game_over"})
        match = Tournament.Matches.get_match(tournament, params.match_id)

        Codebattle.PubSub.broadcast("tournament:match:upserted", %{
          tournament: tournament,
          match: match
        })

        tournament
      end

      def remove_pass_code(%{meta: %{game_passwords: passwords}} = tournament, %{pass_code: pass_code}) do
        if pass_code in passwords do
          update_in(tournament.meta.game_passwords, fn codes ->
            List.delete(codes, pass_code)
          end)
        else
          tournament
        end
      end

      def remove_pass_code(tournament, _params) do
        tournament
      end

      def maybe_finish_round_after_finish_match(tournament) do
        if finish_round_after_match?(tournament) do
          finish_round_and_next_step(tournament)
        else
          tournament
        end
      end

      def finish_round(tournament) do
        finish_all_playing_matches(tournament)

        tournament
        |> prepare_round_finish()
        |> complete_round_finish()
      end

      def finish_round_and_next_step(tournament) do
        tournament
        |> prepare_round_finish()
        |> complete_round_finish()
      end

      def prepare_round_finish(tournament) do
        tournament
        |> update_struct(%{
          last_round_ended_at: NaiveDateTime.utc_now(:second),
          show_results: need_show_results?(tournament)
        })
        |> Tournament.TournamentResult.upsert_results()
        |> calculate_round_results()
        |> Tournament.Ranking.set_ranking()
      end

      def complete_round_finish(tournament) do
        if_result =
          if finish_tournament?(tournament) do
            maybe_finish_tournament(tournament)
          else
            tournament
            |> broadcast_round_finished()
            |> maybe_start_round_or_break_or_finish()
          end

        then(if_result, fn tournament ->
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
            build_and_run_match(tournament, players, game, true)
        end

        tournament
      end

      defp pick_game_winner_id(player_ids, player_results) do
        Enum.find(player_ids, &(player_results[&1] && player_results[&1].result == "won"))
      end

      defp maybe_start_round_or_break_or_finish(%{state: "finished"} = tournament) do
        tournament
      end

      defp maybe_start_round_or_break_or_finish(%{use_infinite_break: true} = tournament) do
        update_struct(tournament, %{break_state: "on", round_state: "break"})
      end

      defp maybe_start_round_or_break_or_finish(%{state: "active"} = tournament) do
        min_break = Application.get_env(:codebattle, :min_break_duration_seconds, 5)
        break_seconds = max(tournament.break_duration_seconds || min_break, min_break)

        Process.send_after(
          self(),
          {:stop_round_break, tournament.current_round_position},
          to_timeout(second: break_seconds)
        )

        update_struct(tournament, %{break_state: "on", round_state: "break"})
      end

      defp increment_current_round(tournament) do
        update_struct(tournament, %{
          current_round_position: tournament.current_round_position + 1
        })
      end

      defp start_round(tournament, round_params \\ %{}) do
        started_at = Map.get(round_params, :started_at, NaiveDateTime.utc_now(:second))

        # Perform initial updates in a single operation
        tournament =
          update_struct(tournament, %{
            break_state: "off",
            last_round_started_at: started_at,
            match_timeout_seconds: Map.get(round_params, :timeout_seconds, tournament.match_timeout_seconds),
            round_state: "round_starting"
          })

        # Build and save round first - this is a critical operation
        tournament = build_and_save_round!(tournament)

        # Perform these operations in sequence as they depend on each other
        tournament =
          tournament
          |> maybe_preload_tasks()
          |> maybe_set_task_ids()
          |> set_current_round_timeout_seconds(round_params)
          |> maybe_start_round_timer(round_params)

        # Build matches - this is the most time-consuming part
        tournament = build_round_matches(tournament, round_params)

        # TODO: Save to database, rething cause big timeout
        tournament = db_save!(tournament)

        # These operations can be done after the critical path
        tournament
        |> update_struct(%{round_state: "active"})
        |> broadcast_round_created()
      end

      defp maybe_set_task_ids(%{current_round_position: 0} = tournament) do
        update_struct(tournament, %{task_ids: get_task_ids(tournament)})
      end

      defp maybe_set_task_ids(tournament), do: tournament

      defp set_current_round_timeout_seconds(tournament, round_params) do
        task = get_task(tournament, get_task_id_by_params(round_params))

        update_struct(tournament, %{
          current_round_timeout_seconds: get_round_game_timeout(tournament, task)
        })
      end

      defp build_round_matches(tournament, round_params) do
        case Map.get(round_params, :match_blueprints) do
          blueprints when is_list(blueprints) and blueprints != [] ->
            build_round_matches_from_blueprints(tournament, blueprints)

          _ ->
            tournament
            |> build_round_pairs()
            |> bulk_insert_round_games(round_params)
        end
      end

      defp build_round_matches_from_blueprints(tournament, match_blueprints) do
        Enum.each(match_blueprints, &create_round_match_from_blueprint(tournament, &1))

        tournament
      end

      defp bulk_insert_round_games({tournament, player_pairs}, round_params) do
        task_id = get_task_id_by_params(round_params)
        task = get_task(tournament, task_id)

        player_pairs
        |> Enum.with_index(matches_count(tournament))
        |> Enum.chunk_every(50)
        |> Enum.each(&bulk_create_round_games_and_matches(&1, tournament, task))

        tournament
      end

      defp bulk_create_round_games_and_matches(batch, tournament, task) do
        game_params =
          Enum.map(batch, fn pairing ->
            {[p1, p2] = players, match_id} = pairing

            base_params = %{
              players: players,
              ref: match_id,
              round_id: tournament.current_round_id,
              round_position: tournament.current_round_position,
              grade: tournament.grade,
              state: "playing",
              task: task,
              tournament_id: tournament.id,
              type: game_type(),
              use_chat: tournament.use_chat,
              use_timer: tournament.use_timer
            }

            params =
              base_params
              |> maybe_set_free_task(tournament, p1)
              |> maybe_add_award(tournament)
              |> then(&Map.put(&1, :timeout_seconds, get_round_game_timeout(tournament, &1.task)))

            {params, players, match_id}
          end)

        game_creation_params =
          Enum.map(game_params, fn {params, _players, _match_id} -> params end)

        created_games = Game.Context.bulk_create_games(game_creation_params)

        _ =
          created_games
          |> Enum.zip(game_params)
          |> Task.async_stream(
            fn {game, {_params, players, _match_id}} ->
              build_and_run_match(tournament, players, game)
            end,
            max_concurrency: System.schedulers_online(),
            ordered: false,
            timeout: 30_000
          )
          |> Enum.to_list()
      end

      defp create_rematch_game(tournament, players, ref) do
        completed_task_ids = Enum.flat_map(players, & &1.task_ids)

        case get_rematch_task(tournament, completed_task_ids) do
          nil ->
            # no more tasks in round tasks, waiting next round
            nil

          task ->
            {:ok, game} =
              %{
                level: task.level,
                players: players,
                ref: ref,
                round_id: tournament.current_round_id,
                round_position: tournament.current_round_position,
                state: "playing",
                task: task,
                # TODO: leave rematch timeout behavior unchanged for now.
                timeout_seconds: get_rematch_game_timeout(tournament),
                tournament_id: tournament.id,
                type: game_type(),
                use_chat: tournament.use_chat,
                use_timer: tournament.use_timer
              }
              |> maybe_add_award(tournament)
              |> Game.Context.create_game()

            game
        end
      end

      defp build_and_run_match(tournament, players, game) do
        build_and_run_match(tournament, players, game, false)
      end

      defp build_and_run_match(tournament, players, game, rematch?) do
        match = %Tournament.Match{
          game_id: game.id,
          rematch: rematch?,
          task_id: game.task_id,
          id: game.ref,
          level: game.level,
          player_ids: players |> Enum.map(& &1.id) |> Enum.sort(),
          round_id: tournament.current_round_id,
          round_position: tournament.current_round_position,
          started_at: TimeHelper.utc_now(),
          state: "playing"
        }

        Tournament.Matches.put_match(tournament, match)

        Enum.each(players, fn player ->
          Tournament.Players.put_player(tournament, %{
            player
            | matches_ids: [match.id | player.matches_ids],
              task_ids: [game.task_id | player.task_ids]
          })
        end)

        Codebattle.PubSub.broadcast("tournament:match:created", %{
          tournament: tournament,
          match: match
        })
      end

      defp create_round_match_from_blueprint(tournament, blueprint) do
        players = tournament |> get_players(blueprint.player_ids) |> Enum.reject(&is_nil/1)

        task = get_task(tournament, blueprint.task_id) || Codebattle.Task.get!(blueprint.task_id)

        {:ok, game} =
          %{
            grade: tournament.grade,
            level: blueprint.level || task.level,
            players: players,
            ref: blueprint.id,
            round_id: tournament.current_round_id,
            round_position: tournament.current_round_position,
            state: "playing",
            task: task,
            task_id: blueprint.task_id,
            timeout_seconds: get_round_game_timeout(tournament, task),
            tournament_id: tournament.id,
            type: game_type(),
            use_chat: tournament.use_chat,
            use_timer: tournament.use_timer
          }
          |> maybe_add_award(tournament)
          |> Game.Context.create_game()

        build_and_run_match(tournament, players, game, false)
      end

      def update_struct(tournament, params) do
        Map.merge(tournament, params)
      end

      def db_save!(tournament, type \\ nil), do: Tournament.Context.upsert!(tournament, type)

      def build_and_save_round!(tournament) do
        round =
          tournament
          |> Context.build()
          |> Context.upsert!()

        update_struct(tournament, %{
          current_round_id: round.id
        })
      end

      def maybe_finish_tournament(tournament) do
        if finish_tournament?(tournament) do
          finish_tournament(tournament)
        else
          tournament
        end
      end

      def finish_tournament(tournament) do
        if get_matches(tournament, "playing") == [] do
          tournament
          |> update_struct(%{state: "finished", finished_at: DateTime.utc_now(:second)})
          |> reset_player_scores()
          |> rebuild_round_results()
          |> recalculate_player_wins_count()
          |> set_stats()
          |> maybe_save_event_results()
          |> upsert_tournament_user_results()
          |> sync_players_from_tournament_user_results()
          |> db_save!(:with_ets)
          |> broadcast_tournament_finished()
          |> then(fn tournament ->
            Process.send_after(self(), :terminate, to_timeout(minute: 30))

            tournament
          end)
        else
          finish_all_playing_matches(tournament)
          timeout_ms = Application.get_env(:codebattle, :tournament_finish_timeout_ms)
          Process.send_after(self(), :finish_tournament_force, timeout_ms)

          update_struct(tournament, %{state: "timeout", finished_at: DateTime.utc_now(:second)})
        end
      end

      defp set_stats(tournament) do
        update_struct(tournament, %{stats: get_stats(tournament)})
      end

      defp rebuild_round_results(tournament) do
        Tournament.TournamentResult.clean_results(tournament.id)

        last_round_position = tournament.current_round_position

        tournament =
          Enum.reduce(0..last_round_position, tournament, fn round_position, tournament ->
            tournament
            |> update_struct(%{current_round_position: round_position})
            |> Tournament.TournamentResult.upsert_results()
            |> Tournament.Ranking.set_ranking()
          end)

        update_struct(tournament, %{current_round_position: last_round_position})
      end

      defp reset_player_scores(tournament) do
        tournament
        |> get_players()
        |> Enum.each(fn player ->
          Tournament.Players.put_player(tournament, %{
            player
            | score: 0,
              place: 0,
              total_duration_sec: 0,
              wins_count: 0,
              last_ranked_round_position: -1
          })
        end)

        tournament
      end

      defp reset_players_for_retry(tournament) do
        players =
          case get_players(tournament) do
            [] -> Map.values(tournament.players)
            ets_players -> ets_players
          end

        players
        |> Enum.reject(& &1.is_bot)
        |> Enum.map(&reset_player_for_retry/1)
      end

      defp reset_player_for_retry(player) do
        Map.merge(player, %{
          draw_index: 1,
          last_ranked_round_position: -1,
          matches_ids: [],
          max_draw_index: 0,
          place: 0,
          rank: 5432,
          rating: 1200,
          score: 0,
          state: "active",
          task_ids: [],
          total_duration_sec: 0,
          wins_count: 0,
          wr_joined_at: nil
        })
      end

      defp recalculate_player_wins_count(tournament) do
        wins_count_by_user = Tournament.TournamentResult.get_wins_count_by_user(tournament)

        tournament
        |> get_players()
        |> Enum.each(fn player ->
          Tournament.Players.put_player(tournament, %{
            player
            | wins_count: Map.get(wins_count_by_user, player.id, 0)
          })
        end)

        tournament
      end

      defp maybe_start_global_timer(%{tournament_timeout_seconds: timer} = tournament) when is_integer(timer) do
        Process.send_after(
          self(),
          :finish_tournament_force,
          to_timeout(second: timer)
        )

        tournament
      end

      defp maybe_start_global_timer(tournament), do: tournament

      # per_task: no round timer, games timeout individually
      defp maybe_start_round_timer(%{timeout_mode: "per_task"} = tournament, _round_params), do: tournament
      # per_tournament: global timer handles it
      defp maybe_start_round_timer(%{timeout_mode: "per_tournament"} = tournament, _round_params), do: tournament
      # per_round_fixed: swiss/top200 don't need round timer (games have individual timeouts,
      # rounds finish when all games complete)
      defp maybe_start_round_timer(%{timeout_mode: "per_round_fixed", type: "swiss"} = tournament, _round_params),
        do: tournament

      defp maybe_start_round_timer(%{timeout_mode: "per_round_fixed", type: "top200"} = tournament, _round_params),
        do: tournament

      # per_round_with_rematch and per_round_fixed (for show type) need the round timer
      defp maybe_start_round_timer(tournament, round_params) do
        timeout_seconds =
          Map.get(round_params, :remaining_timeout_seconds, tournament.round_timeout_seconds)

        Process.send_after(
          self(),
          {:finish_round_force, tournament.current_round_position},
          to_timeout(second: max(timeout_seconds || 0, 0))
        )

        tournament
      end

      defp restore_round(tournament, params) do
        tournament
        |> build_and_save_round!()
        |> maybe_preload_tasks()
        |> maybe_set_task_ids()
        |> set_current_round_timeout_seconds(params)
        |> maybe_start_round_timer(params)
        |> build_round_matches(params)
        |> update_struct(%{round_state: "active"})
        |> broadcast_round_created()
      end

      defp restore_previous_round_state(tournament, completed_round_position) do
        tournament
        |> reset_players_for_restore()
        |> rebuild_player_history_from_matches()
        |> rebuild_ranking_for_restore(completed_round_position)
        |> recalculate_player_wins_count()
      end

      defp reset_players_for_restore(tournament) do
        tournament
        |> get_players()
        |> Enum.each(fn player ->
          restored_state = if(player.state == "banned", do: "banned", else: "active")

          Tournament.Players.put_player(tournament, %{
            player
            | last_ranked_round_position: -1,
              matches_ids: [],
              place: 0,
              score: 0,
              state: restored_state,
              task_ids: [],
              total_duration_sec: 0,
              wins_count: 0
          })
        end)

        Ranking.put_ranking(tournament, [])
        tournament
      end

      defp rebuild_player_history_from_matches(tournament) do
        tournament
        |> get_matches()
        |> Enum.sort_by(&{&1.round_position, &1.id})
        |> Enum.each(fn match ->
          Enum.each(match.player_ids, fn player_id ->
            rebuild_player_history_from_match(tournament, match, player_id)
          end)
        end)

        tournament
      end

      defp rebuild_player_history_from_match(tournament, match, player_id) do
        case Tournament.Players.get_player(tournament, player_id) do
          nil ->
            :noop

          player ->
            Tournament.Players.put_player(tournament, %{
              player
              | matches_ids: [match.id | player.matches_ids],
                task_ids: [match.task_id | player.task_ids]
            })
        end
      end

      defp rebuild_ranking_for_restore(tournament, completed_round_position) when completed_round_position < 0 do
        ranking =
          tournament
          |> get_players()
          |> Enum.reject(&(&1.is_bot || &1.state == "banned"))
          |> Enum.sort_by(& &1.id)
          |> Enum.with_index(1)
          |> Enum.map(fn {player, place} ->
            Tournament.Players.put_player(tournament, %{player | place: place})

            %{
              id: player.id,
              place: place,
              score: 0,
              lang: player.lang,
              name: player.name,
              clan_id: player.clan_id,
              clan: player.clan
            }
          end)

        Ranking.put_ranking(tournament, ranking)
        tournament
      end

      defp rebuild_ranking_for_restore(tournament, completed_round_position) do
        target_round_position = tournament.current_round_position

        tournament =
          Enum.reduce(0..completed_round_position, tournament, fn round_position, acc ->
            acc
            |> update_struct(%{current_round_position: round_position})
            |> Tournament.TournamentResult.upsert_results()
            |> Tournament.Ranking.set_ranking()
          end)

        update_struct(tournament, %{current_round_position: target_round_position})
      end

      defp broadcast_round_created(tournament) do
        Codebattle.PubSub.broadcast("tournament:round_created", %{tournament: tournament})

        tournament
      end

      def broadcast_round_finished(tournament) do
        Codebattle.PubSub.broadcast("tournament:round_finished", %{tournament: tournament})
        tournament
      end

      defp broadcast_tournament_started(tournament) do
        Codebattle.PubSub.broadcast("tournament:started", %{tournament: tournament})
        tournament
      end

      defp broadcast_tournament_canceled(tournament) do
        Codebattle.PubSub.broadcast("tournament:canceled", %{tournament: tournament})
        tournament
      end

      defp broadcast_tournament_finished(tournament) do
        Codebattle.PubSub.broadcast("tournament:finished", %{tournament: tournament})
        tournament
      end

      defp get_round_game_timeout(tournament, task) do
        case tournament.timeout_mode do
          "per_tournament" ->
            max(
              tournament.tournament_timeout_seconds -
                DateTime.diff(DateTime.utc_now(), tournament.started_at),
              10
            )

          mode when mode in ["per_round_fixed", "per_round_with_rematch"] ->
            tournament.round_timeout_seconds

          _per_task ->
            (task && task.time_to_solve_sec) || 300
        end
      end

      defp get_rematch_game_timeout(%{timeout_mode: "per_round_with_rematch"} = tournament) do
        elapsed = NaiveDateTime.diff(NaiveDateTime.utc_now(), tournament.last_round_started_at)
        max(tournament.round_timeout_seconds - elapsed, 10)
      end

      defp get_rematch_game_timeout(tournament), do: get_round_timeout_seconds(tournament)

      defp get_round_timeout_seconds(tournament) do
        if tournament.timeout_mode in ["per_round_fixed", "per_round_with_rematch"] do
          tournament.round_timeout_seconds
        else
          tournament.match_timeout_seconds
        end
      end

      defp broadcast_tournament_update(tournament) do
        Codebattle.PubSub.broadcast("tournament:updated", %{tournament: tournament})
      end

      defp maybe_preload_tasks(%{current_round_position: 0} = tournament) do
        Tournament.Tasks.put_tasks(tournament, get_all_tasks(tournament))

        tournament
      end

      defp maybe_preload_tasks(tournament), do: tournament

      # defp need_show_results?(tournament = %{type: "swiss"}), do: !finish_tournament?(tournament)
      defp need_show_results?(tournament), do: true

      defp get_task_id_by_params(%{task_id: task_id}), do: task_id
      defp get_task_id_by_params(_round_params), do: nil

      defp finish_all_playing_matches(tournament) do
        matches_to_finish = get_matches(tournament, "playing")

        # Early return if no matches to finish
        if matches_to_finish == [] do
          tournament
        else
          # Process matches in parallel with Task.async_stream
          # Process all matches and await completion
          _ =
            matches_to_finish
            |> Task.async_stream(
              fn match ->
                # trigger game timeout and set player results
                {:ok, game} = Game.Context.trigger_timeout(match.game_id)

                handle_game_result(tournament, %{
                  ref: match.id,
                  game_state: "timeout",
                  player_results: Game.Helpers.get_player_results(game),
                  duration_sec: game.duration_sec
                })
              end,
              max_concurrency: System.schedulers_online() * 2,
              timeout: 10_000
            )
            |> Enum.to_list()

          tournament
        end
      end

      defp maybe_add_award(game_params, %{type: "show"} = tournament) do
        tournament.meta
        |> Map.get(:rounds_config)
        |> case do
          nil ->
            Map.put(game_params, :award, nil)

          config ->
            config
            |> Enum.at(tournament.current_round_position)
            |> case do
              %{award: award} ->
                Map.put(game_params, :award, award)

              _ ->
                Map.put(game_params, :award, nil)
            end
        end
      end

      defp maybe_add_award(game_params, _tournament), do: game_params

      defp maybe_set_free_task(game_params, %Tournament{type: "show", task_strategy: "sequential"} = tournament, player) do
        task_id = Enum.at(tournament.task_ids, Enum.count(player.task_ids))

        game_params
        |> Map.put(:task_id, task_id)
        |> Map.put(:task, get_task(tournament, task_id))
      end

      defp maybe_set_free_task(game_params, _tournament, _player) do
        game_params
      end

      defp get_or_build_tournament_bot(tournament) do
        meta = tournament.meta || %{}
        bot_id = Map.get(meta, :bot_id)

        case bot_id && Bot.Context.get(bot_id) do
          %{} = bot ->
            {tournament, Tournament.Player.new!(bot)}

          _ ->
            bot = Bot.Context.build()
            meta = Map.put(meta, :bot_id, bot.id)
            {update_struct(tournament, %{meta: meta}), Tournament.Player.new!(bot)}
        end
      end

      defp upsert_tournament_user_results(tournament) do
        Tournament.TournamentUserResult.upsert_results(tournament)
      end

      defp sync_players_from_tournament_user_results(tournament) do
        results_by_user =
          tournament.id
          |> Tournament.TournamentUserResult.get_by()
          |> Map.new(&{&1.user_id, &1})

        ranking =
          results_by_user
          |> Map.values()
          |> Enum.sort_by(& &1.place)
          |> Enum.map(fn result ->
            %{
              id: result.user_id,
              place: result.place,
              score: result.score,
              lang: result.user_lang,
              name: result.user_name,
              clan_id: result.clan_id,
              clan: result.clan_name
            }
          end)

        Ranking.put_ranking(tournament, ranking)

        tournament
        |> get_players()
        |> Enum.each(fn player ->
          if !player.is_bot do
            result = Map.get(results_by_user, player.id)

            Tournament.Players.put_player(tournament, %{
              player
              | place: if(result, do: result.place, else: 0),
                score: if(result, do: result.score, else: 0),
                total_duration_sec: if(result, do: result.total_time, else: 0),
                wins_count: if(result, do: result.wins_count, else: 0)
            })
          end
        end)

        tournament
      end

      defp maybe_save_event_results(%{use_clan: true, event_id: event_id} = tournament) when not is_nil(event_id) do
        Event.EventClanResult.save_results(tournament)
        Event.EventResult.save_results(tournament)
        tournament
      end

      defp maybe_save_event_results(%{event_id: _event_id} = tournament) do
        Codebattle.UserEvent.Stage.Context.save_tournament_results_async(tournament.id)
        tournament
      end

      defp maybe_save_event_results(t), do: t

      defp maybe_activate_players(%{current_round_position: 0} = t), do: t

      defp maybe_activate_players(t), do: t

      defp maybe_update_player_result(tournament, player_id, player_result) do
        case Tournament.Players.get_player(tournament, player_id) do
          nil ->
            :ok

          player ->
            player
            |> Map.put(:lang, player_result.lang)
            |> Map.put(:rating, player_result.rating)
            |> Map.put(
              :wins_count,
              player.wins_count + if(player_result.result == "won", do: 1, else: 0)
            )
            |> then(&Tournament.Players.put_player(tournament, &1))
        end
      end

      defoverridable maybe_finish_round_after_finish_match: 1
    end
  end
end
