defmodule Codebattle.Tournament.Base do
  alias Codebattle.Repo
  alias Codebattle.Tournament

  @moduledoc """
  Defines interface for tournament type
  """
  @callback join(%Codebattle.Tournament{}, map()) :: %Codebattle.Tournament{}
  @callback complete_players(%Codebattle.Tournament{}) :: %Codebattle.Tournament{}
  @callback build_matches(%Codebattle.Tournament{}) :: %Codebattle.Tournament{}
  @callback maybe_finish(%Codebattle.Tournament{}) :: %Codebattle.Tournament{}
  @callback create_game(%Codebattle.Tournament{}, %Codebattle.Tournament.Types.Match{}) ::
              %Codebattle.Tournament.Types.Match{}

  defmacro __using__(_opts) do
    quote do
      @behaviour Tournament.Base
      import Tournament.Helpers

      def add_intended_player_id(tournament, player_id) do
        new_ids =
          tournament
          |> get_intended_player_ids
          |> Enum.concat([player_id])
          |> Enum.uniq()

        new_data =
          tournament
          |> Map.get(:data)
          |> Map.merge(%{intended_player_ids: new_ids})
          |> Map.from_struct()

        update!(tournament, %{data: new_data})
      end

      def add_player(tournament, player) do
        players =
          tournament
          |> get_players
          |> Enum.concat([player])
          |> Enum.uniq_by(fn x -> x.id end)

        new_data =
          tournament |> Map.get(:data) |> Map.merge(%{players: players}) |> Map.from_struct()

        update!(tournament, %{data: new_data})
      end

      def leave(tournament, %{user: user}) do
        leave(tournament, %{user_id: user.id})
      end

      def leave(tournament, %{user_id: user_id}) do
        new_ids =
          tournament
          |> get_intended_player_ids
          |> Enum.filter(fn id -> id != user_id end)

        new_players =
          tournament
          |> get_players
          |> Enum.filter(fn player -> player.id != user_id end)

        new_data =
          tournament
          |> Map.get(:data)
          |> Map.merge(%{players: new_players, intended_player_ids: new_ids})
          |> Map.from_struct()

        update!(tournament, %{data: new_data})
      end

      def leave(tournament, _user_id), do: tournament

      def back(%{state: "waiting_participants"} = tournament, %{user: user}) do
        update!(tournament, %{state: "upcoming"})
      end

      def back(tournament, _user), do: tournament

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

      def start(%{state: "upcoming"} = tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          update!(tournament, %{state: "waiting_participants"})
        else
          tournament
        end
      end

      def start(%{state: "waiting_participants"} = tournament, %{user: user}) do
        if can_moderate?(tournament, user) do
          tournament
          |> complete_players
          |> start_step!
          |> update!(%{
            last_round_started_at: NaiveDateTime.utc_now(),
            state: "active"
          })
        else
          tournament
        end
      end

      def start(tournament, _params), do: tournament

      def maybe_start_new_step(tournament) do
        matches = get_matches(tournament)

        if Enum.any?(matches, fn match -> match.state == "playing" end) do
          tournament
        else
          tournament
          |> update!(%{
            step: tournament.step + 1,
            last_round_started_at: NaiveDateTime.utc_now()
          })
          |> maybe_finish
          |> start_step!
        end
      end

      def finish_match(tournament, payload) do
        %{game_id: game_id, game_state: game_state, player_results: player_results} = payload
        params = %{state: game_state, player_results: player_results}

        tournament
        |> update_match(game_id, params)
        |> maybe_start_new_step()
      end

      def update_match(tournament, game_id, params) when is_bitstring(game_id) do
        {game_id_int, _} = Integer.parse(game_id)
        update_match(tournament, game_id_int, params)
      end

      def update_match(tournament, game_id, params) do
        new_matches =
          tournament
          |> get_matches
          |> Enum.map(fn match ->
            case {match.game_id, match.state} do
              {^game_id, s} when s in ~w(pending playing) ->
                new_params = Map.put(params, :started_at, tournament.last_round_started_at)
                update_match_params(match, new_params)

              _ ->
                match
            end
            |> Map.from_struct()
          end)

        new_data =
          tournament |> Map.get(:data) |> Map.merge(%{matches: new_matches}) |> Map.from_struct()

        update!(tournament, %{data: new_data})
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

      defp start_step!(%{state: "finished"} = tournament), do: tournament

      defp start_step!(tournament) do
        tournament
        |> build_matches()
        |> start_matches()
        |> broadcast_new_step()
        |> maybe_start_new_step()
      end

      defp start_matches(tournament) do
        new_matches =
          tournament
          |> get_matches
          |> Enum.map(fn match ->
            case match do
              %{players: [%{is_bot: true}, %{is_bot: true}]} ->
                %{match | state: "canceled"}

              %{state: "pending"} ->
                game_id = create_game(tournament, match)
                %{match | game_id: game_id, state: "playing"}

              _ ->
                match
            end
            |> Map.from_struct()
          end)

        new_data =
          tournament |> Map.get(:data) |> Map.merge(%{matches: new_matches}) |> Map.from_struct()

        update!(tournament, %{data: new_data})
      end

      defp update_match_params(match, %{state: state} = params)
           when state in ~w(timeout game_over) do
        %{
          player_results: player_results,
          started_at: started_at
        } = params

        new_duration = get_new_duration(started_at)

        new_players =
          Enum.map(match.players, fn player ->
            Map.put(player, :game_result, player_results[player.id])
          end)

        Map.merge(match, %{players: new_players, duration: new_duration, state: state})
      end

      defp update_match_params(match, _params), do: match

      def update!(tournament, params) do
        tournament |> Tournament.changeset(params) |> Repo.update!()
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

      defp broadcast_new_step(tournament) do
        CodebattleWeb.Endpoint.broadcast!(
          "tournaments",
          "round:created",
          %{tournament: tournament}
        )

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
