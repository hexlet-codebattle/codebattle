defmodule Codebattle.Tournament.Base do
  # credo:disable-for-this-file Credo.Check.Refactor.LongQuoteBlocks
  alias Codebattle.Tournament

  @moduledoc """
  Defines interface for tournament type
  """
  @callback complete_players(Tournament.t()) :: Tournament.t()
  @callback build_matches(Tournament.t()) :: Tournament.t()
  @callback maybe_finish(Tournament.t()) :: Tournament.t()
  @callback calculate_round_results(Tournament.t()) :: Tournament.t()

  defmacro __using__(_opts) do
    quote do
      @behaviour Tournament.Base
      import Tournament.Helpers

      def add_player(tournament, player) do
        if players_count(tournament) < tournament.players_limit do
          new_players =
            Map.put(tournament.players, to_id(player.id), Tournament.Player.new!(player))

          update!(tournament, %{players: new_players})
        else
          tournament
        end
      end

      def join(tournament = %{state: "waiting_participants"}, params) do
        player =
          params.user
          |> Map.put(:lang, params.user.lang || tournament.default_language)
          |> Map.put(:team_id, Map.get(params, :team_id))

        add_player(tournament, player)
      end

      def join(tournament, _), do: tournament

      def leave(tournament, %{user: user}) do
        leave(tournament, %{user_id: user.id})
      end

      def leave(tournament, %{user_id: user_id}) do
        new_players = Map.drop(tournament.players, [to_id(user_id)])

        update!(tournament, %{players: new_players})
      end

      def leave(tournament, _user_id), do: tournament

      def open_up(tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          update!(tournament, %{access_type: "public"})
        else
          tournament
        end
      end

      def cancel(tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          new_tournament = update!(tournament, %{state: "canceled"})

          Tournament.GlobalSupervisor.terminate_tournament(tournament.id)

          new_tournament
        else
          tournament
        end
      end

      def start(tournament = %{state: "waiting_participants"}, %{user: user}) do
        if can_moderate?(tournament, user) do
          tournament =
            tournament
            |> complete_players()
            |> start_round()

          tournament
          |> update!(%{
            players_count: players_count(tournament),
            last_round_started_at: NaiveDateTime.utc_now(),
            state: "active"
          })
        else
          tournament
        end
      end

      def start(tournament, _params), do: tournament

      def restart(tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          tournament
          |> update!(%{
            players: %{},
            matches: %{},
            players_count: 0,
            current_round: 0,
            last_round_started_at: nil,
            state: "waiting_participants"
          })
        else
          tournament
        end
      end

      def restart(tournament, _user), do: tournament

      def finish_match(tournament, payload) do
        tournament
        |> update_match(payload)
        |> maybe_start_new_round()
      end

      def update_match(tournament, params) do
        new_tournament =
          update_in(tournament.matches[to_id(params.ref)], fn match ->
            case params.game_state do
              "timeout" ->
                %{match | state: "timeout"}

              "game_over" ->
                winner_id = pick_game_winner_id(match.player_ids, params.player_results)
                %{match | state: "game_over", winner_id: winner_id}
            end
          end)
      end

      def maybe_start_new_round(tournament) do
        matches = get_matches(tournament)

        if Enum.any?(matches, fn match -> match.state == "playing" end) do
          tournament
        else
          tournament
          |> calculate_round_results()
          |> update!(%{
            current_round: tournament.current_round + 1,
            last_round_started_at: NaiveDateTime.utc_now()
          })
          |> maybe_finish()
          |> start_round()
        end
      end

      defp pick_game_winner_id(player_ids, player_results) do
        Enum.find(player_ids, &(player_results[&1] == "won"))
      end

      def cancel_all_matches(tournament) do
        new_matches =
          tournament
          |> get_matches
          |> Enum.map(fn match ->
            %{match | state: "canceled"}
            |> Map.from_struct()
          end)

        new_data =
          tournament |> Map.get(:data) |> Map.merge(%{matches: new_matches}) |> Map.from_struct()

        update!(tournament, %{data: new_data})
      end

      defp start_round(tournament = %{state: "finished"}), do: tournament

      defp start_round(tournament) do
        tournament
        |> build_matches()
        # |> create_games_for_matches()
        |> broadcast_new_round()
      end

      # defp create_games_for_matches(tournament) do
      #   new_round_matches =
      #     tournament
      #     # |> get_current_round_matches()
      #     |> Enum.map(fn match ->
      #       case match do
      #         %{state: "pending", player_ids: [id1, id2]} when id1 < 0 and id2 < 0 ->
      #           # cancel for bots
      #           %{match | state: "canceled"}

      #         %{state: "pending", game_id: nil} ->
      #           game_id = create_game(tournament, match)
      #           %{match | game_id: game_id, state: "playing"}

      #         _ ->
      #           match
      #       end
      #     end)

      #   new_matches =
      #     tournament.matches
      #     |> Map.put(tournament.current_round, new_round_matches)

      #   update!(tournament, %{matches: new_matches})
      # end

      def update!(tournament, params) do
        tournament |> Tournament.changeset(params) |> Ecto.Changeset.apply_action!(:update)
      end

      def finish_all_playing_matches(tournament) do
        new_matches =
          tournament
          |> get_matches
          |> Enum.map(fn match ->
            case match.state do
              "playing" -> %{match | state: "game_over"}
              _ -> match
            end
            |> Map.from_struct()
          end)

        new_data =
          tournament |> Map.get(:data) |> Map.merge(%{matches: new_matches}) |> Map.from_struct()

        update!(tournament, %{data: new_data})
      end

      defp broadcast_new_round(tournament) do
        Codebattle.PubSub.broadcast("tournament:round_created", %{tournament: tournament})
        tournament
      end

      # for individual game
      defp get_new_duration(nil), do: 0
      # for team game
      defp get_new_duration(started_at),
        do: NaiveDateTime.diff(NaiveDateTime.utc_now(), started_at, :millisecond)
    end
  end
end

# list =
#   Enum.reduce(1..100000, [], fn _, acc ->
#     map = %{
#       a: :rand.uniform(100000),
#       b: :rand.uniform(100000),
#       c: :rand.uniform(100000),
#       d: :rand.uniform(100000),
#       e: :rand.uniform(100000),
#       f: :rand.uniform(100000),
#       g: :rand.uniform(100000),
#       h: :rand.uniform(100000),
#       hd: :rand.uniform(100000),
#     }

#     [map | acc]
#   end)

# :timer.tc(fn -> Enum.any?(list, fn x -> x.a == 2000000 end) end)
