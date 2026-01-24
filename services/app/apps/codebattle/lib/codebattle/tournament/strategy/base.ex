defmodule Codebattle.Tournament.Base do
  # credo:disable-for-this-file Credo.Check.Refactor.LongQuoteBlocks
  @moduledoc """
  Defines interface for tournament type
  """

  alias Codebattle.Event
  alias Codebattle.Game
  alias Codebattle.Tournament
  alias Codebattle.UserEvent
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

      def join(%{state: "waiting_participants"} = tournament, %{users: users} = params) do
        player_params = Map.delete(params, :users)
        Enum.reduce(users, tournament, &join(&2, Map.put(player_params, :user, &1)))
      end

      def join(%{state: "waiting_participants"} = tournament, params) do
        player = Map.put(params.user, :lang, params.user.lang)

        if players_count(tournament) < tournament.players_limit do
          add_player(tournament, player)
        else
          tournament
        end
      end

      def join(%{state: "active", type: "swiss"} = tournament, params) do
        player = Map.put(params.user, :lang, params.user.lang)

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
        Tournament.Ranking.drop_player(tournament, user_id)
        Map.put(tournament, :players_count, players_count(tournament))
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

          Tournament.Players.put_player(tournament, new_player)
          UserGameReport.mark_as_confirmed(tournament.id, player.id)

          Codebattle.PubSub.broadcast("tournament:player:banned", %{
            tournament: tournament,
            player: new_player,
            game_ids: game_ids
          })
        end

        tournament
      end

      def unban_player(tournament, player, game_ids) do
        new_state =
          if tournament.state == "finished" do
            "finished"
          else
            "active"
          end

        new_player = %{player | state: new_state}
        Tournament.Players.put_player(tournament, new_player)

        Codebattle.PubSub.broadcast("tournament:player:unbanned", %{
          tournament: tournament,
          player: new_player,
          game_ids: game_ids
        })
      end

      def toggle_ban_player(tournament, %{user_id: user_id}) do
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
        end

        tournament
      end

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
          started_at: DateTime.utc_now(:second),
          state: "active"
        })
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

      def finish_match(%{state: "timeout"} = tournament, params) do
        handle_game_result(tournament, params)
      end

      def finish_match(tournament, params) do
        tournament
        |> handle_game_result(params)
        |> maybe_create_rematch(params)
        |> maybe_finish_round_after_finish_match()
      end

      def handle_game_result(tournament, params) do
        match = get_match(tournament, params.ref)
        winner_id = pick_game_winner_id(match.player_ids, params.player_results)

        params.player_results
        |> Map.keys()
        |> Enum.each(fn player_id ->
          player = Tournament.Players.get_player(tournament, player_id)

          if player do
            player = %{
              player
              | lang: params.player_results[player_id].lang,
                rating: params.player_results[player_id].rating,
                wins_count:
                  player.wins_count +
                    if(params.player_results[player_id].result == "won", do: 1, else: 0)
            }

            Tournament.Players.put_player(tournament, player)
          end
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

        finish_round_and_next_step(tournament)
      end

      def finish_round_and_next_step(tournament) do
        tournament
        |> update_struct(%{
          last_round_ended_at: NaiveDateTime.utc_now(:second),
          show_results: need_show_results?(tournament)
        })
        |> Tournament.TournamentResult.upsert_results()
        |> calculate_round_results()
        |> Tournament.Ranking.set_ranking()
        |> broadcast_round_finished()
        |> maybe_finish_tournament()
        |> maybe_start_round_or_break_or_finish()
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
        update_struct(tournament, %{break_state: "on"})
      end

      defp maybe_start_round_or_break_or_finish(
             %{
               state: "active",
               break_duration_seconds: break_duration_seconds,
               current_round_position: current_round_position
             } = tournament
           )
           when break_duration_seconds not in [nil, 0] do
        Process.send_after(
          self(),
          {:stop_round_break, tournament.current_round_position},
          to_timeout(second: break_duration_seconds)
        )

        update_struct(tournament, %{break_state: "on"})
      end

      defp maybe_start_round_or_break_or_finish(tournament) do
        start_round_force(tournament)
      end

      defp increment_current_round(tournament) do
        update_struct(tournament, %{
          current_round_position: tournament.current_round_position + 1
        })
      end

      defp start_round(tournament, round_params \\ %{}) do
        # Perform initial updates in a single operation
        tournament =
          update_struct(tournament, %{
            break_state: "off",
            last_round_started_at: NaiveDateTime.utc_now(:second),
            match_timeout_seconds: Map.get(round_params, :timeout_seconds, tournament.match_timeout_seconds)
          })

        # Build and save round first - this is a critical operation
        tournament = build_and_save_round!(tournament)

        # Perform these operations in sequence as they depend on each other
        tournament =
          tournament
          |> maybe_preload_tasks()
          |> maybe_set_task_ids()
          |> maybe_start_round_timer()

        # Build matches - this is the most time-consuming part
        tournament = build_round_matches(tournament, round_params)

        # TODO: Save to database, rething cause big timeout
        tournament = db_save!(tournament)

        # These operations can be done after the critical path
        broadcast_round_created(tournament)
      end

      defp maybe_set_task_ids(%{current_round_position: 0} = tournament) do
        update_struct(tournament, %{task_ids: get_task_ids(tournament)})
      end

      defp maybe_set_task_ids(tournament), do: tournament

      defp build_round_matches(tournament, round_params) do
        tournament
        |> build_round_pairs()
        |> bulk_insert_round_games(round_params)
      end

      defp bulk_insert_round_games({tournament, player_pairs}, round_params) do
        task_id = get_task_id_by_params(round_params)
        task = get_task(tournament, task_id)
        timeout_seconds = get_game_timeout(tournament, task)

        player_pairs
        |> Enum.with_index(matches_count(tournament))
        |> Enum.chunk_every(50)
        |> Enum.each(&bulk_create_round_games_and_matches(&1, tournament, task, timeout_seconds))

        update_struct(tournament, %{round_timeout_seconds: timeout_seconds})
      end

      defp bulk_create_round_games_and_matches(batch, tournament, task, timeout_seconds) do
        # Prepare game creation parameters in a single pass
        game_params =
          Enum.map(batch, fn
            {[p1, p2] = players, match_id} ->
              base_params = %{
                players: players,
                ref: match_id,
                round_id: tournament.current_round_id,
                round_position: tournament.current_round_position,
                grade: tournament.grade,
                state: "playing",
                task: task,
                timeout_seconds: timeout_seconds,
                tournament_id: tournament.id,
                type: game_type(),
                use_chat: tournament.use_chat,
                use_timer: tournament.use_timer
              }

              # Apply transformations
              params =
                base_params
                |> maybe_set_free_task(tournament, p1)
                |> maybe_add_award(tournament)

              {params, players, match_id}
          end)

        # Extract just the game parameters for bulk creation
        game_creation_params =
          Enum.map(game_params, fn {params, _players, _match_id} -> params end)

        # Create games in bulk
        created_games = Game.Context.bulk_create_games(game_creation_params)

        # Process matches in parallel using Task.async_stream with controlled concurrency
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
                timeout_seconds: get_game_timeout(tournament, task),
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

      defp maybe_finish_tournament(tournament) do
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
          |> Tournament.TournamentResult.upsert_results()
          |> set_stats()
          |> maybe_save_event_results()
          |> upsert_tournament_user_results()
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

      defp maybe_start_global_timer(%{tournament_timeout_seconds: timer} = tournament) when is_integer(timer) do
        Process.send_after(
          self(),
          :finish_tournament_force,
          to_timeout(second: timer)
        )

        tournament
      end

      defp maybe_start_global_timer(tournament), do: tournament

      # We don't want to run a timer for the swiss type, because all games already have a timeout
      defp maybe_start_round_timer(%{state: "active", type: "swiss"} = tournament), do: tournament

      defp maybe_start_round_timer(%{round_timeout_seconds: nil} = tournament), do: tournament

      defp maybe_start_round_timer(%{state: "active", type: "top200"} = tournament), do: tournament

      defp maybe_start_round_timer(tournament) do
        Process.send_after(
          self(),
          {:finish_round_force, tournament.current_round_position},
          to_timeout(second: tournament.round_timeout_seconds)
        )

        tournament
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

      defp broadcast_tournament_canceled(tournament) do
        Codebattle.PubSub.broadcast("tournament:canceled", %{tournament: tournament})
        tournament
      end

      defp broadcast_tournament_finished(tournament) do
        Codebattle.PubSub.broadcast("tournament:finished", %{tournament: tournament})
        tournament
      end

      defp get_game_timeout(tournament, task) do
        cond do
          tournament.tournament_timeout_seconds ->
            max(
              tournament.tournament_timeout_seconds -
                DateTime.diff(DateTime.utc_now(), tournament.started_at),
              10
            )

          FunWithFlags.enabled?(:tournament_custom_timeout) ->
            get_custom_round_timeout_seconds(tournament, task)

          tournament.type in ["top200"] ->
            min(seconds_to_end_round(tournament), tournament.match_timeout_seconds)

          true ->
            get_round_timeout_seconds(tournament)
        end
      end

      defp get_custom_round_timeout_seconds(tournament, task) do
        (task && task.time_to_solve_sec) || get_round_timeout_seconds(tournament)
      end

      defp seconds_to_end_round(tournament) do
        max(
          get_round_timeout_seconds(tournament) -
            NaiveDateTime.diff(NaiveDateTime.utc_now(), tournament.last_round_started_at),
          0
        )
      end

      defp get_round_timeout_seconds(tournament) do
        tournament.round_timeout_seconds || tournament.match_timeout_seconds
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

      defp maybe_save_event_results(%{use_clan: true, event_id: event_id} = tournament) when not is_nil(event_id) do
        Event.EventClanResult.save_results(tournament)
        Event.EventResult.save_results(tournament)
        tournament
      end

      defp maybe_save_event_results(%{event_id: event_id} = tournament) when not is_nil(event_id) do
        tournament
        |> get_players()
        |> Enum.each(fn player ->
          if !player.is_bot do
            UserEvent.mark_stage_as_completed(event_id, player.id, %{
              id: tournament.id,
              wins_count: player.wins_count,
              games_count: get_players_total_games_count(tournament, player),
              time_spent_in_seconds:
                tournament
                |> get_matches(player.matches_ids)
                |> Enum.map(&(&1.duration_sec || 0))
                |> Enum.sum()
            })
          end
        end)

        tournament
      end

      defp maybe_save_event_results(t), do: t

      defp maybe_activate_players(%{current_round_position: 0} = t), do: t

      defp maybe_activate_players(t), do: t
    end
  end
end
