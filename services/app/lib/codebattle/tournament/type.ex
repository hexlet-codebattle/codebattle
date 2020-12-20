defmodule Codebattle.Tournament.Type do
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.GameProcess.{Play, FsmHelpers}

  @moduledoc """
  Defines interface for tournament type
  """
  @callback join(%Codebattle.Tournament{}, map()) :: %Codebattle.Tournament{}
  @callback complete_players(%Codebattle.Tournament{}) :: %Codebattle.Tournament{}
  @callback build_matches(%Codebattle.Tournament{}) :: %Codebattle.Tournament{}
  @callback maybe_finish(%Codebattle.Tournament{}) :: %Codebattle.Tournament{}

  defmacro __using__(_opts) do
    quote do
      @behaviour Tournament.Type
      import Tournament.Helpers

      def leave(tournament, %{user: user}) do
        new_players =
          tournament.data.players
          |> Enum.filter(fn x -> x.id != user.id end)

        tournament
        |> Tournament.changeset(%{
          data: DeepMerge.deep_merge(tournament.data, %{players: new_players})
        })
        |> Repo.update!()
      end

      def cancel(tournament, %{user: user}) do
        if is_creator?(tournament, user.id) do
          new_tournament =
            tournament
            |> Tournament.changeset(%{state: "canceled"})
            |> Repo.update!()

          Tournament.GlobalSupervisor.terminate_tournament(tournament.id)

          new_tournament
        else
          tournament
        end
      end

      def start(tournament, %{user: user}) do
        if is_creator?(tournament, user.id) do
          tournament
          |> complete_players
          |> start_step!
          |> Tournament.changeset(%{
            last_round_started_at: NaiveDateTime.utc_now(),
            state: "active"
          })
          |> Repo.update!()
        else
          tournament
        end
      end

      def maybe_start_new_step(tournament) do
        matches = tournament |> get_matches

        if Enum.any?(matches, fn match -> match.state == "active" end) do
          tournament
        else
          tournament
          |> Tournament.changeset(%{
            step: tournament.step + 1,
            last_round_started_at: NaiveDateTime.utc_now()
          })
          |> Repo.update!()
          |> maybe_finish
          |> start_step!
        end
      end

      def game_over(tournament, params) do
        tournament
        |> update_match(params.game_id, params)
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
            case match.game_id do
              ^game_id ->
                new_params = Map.put(params, :started_at, tournament.last_round_started_at)
                update_match_params(match, new_params)

              _ ->
                match
            end
            |> Map.from_struct()
          end)

        tournament
        |> Tournament.changeset(%{
          data: DeepMerge.deep_merge(Map.from_struct(tournament.data), %{matches: new_matches})
        })
        |> Repo.update!()
      end

      defp start_step!(%{state: "finished"} = tournament), do: tournament

      defp start_step!(tournament) do
        tournament
        |> build_matches
        |> start_games()
        |> broadcast_new_step()
      end

      defp pick_winner(%{players: [%{game_result: "won"} = winner, _]}), do: winner
      defp pick_winner(%{players: [_, %{game_result: "won"} = winner]}), do: winner
      defp pick_winner(%{players: [winner, %{game_result: "gave_up"}]}), do: winner
      defp pick_winner(%{players: [%{game_result: "gave_up"}, winner]}), do: winner
      defp pick_winner(match), do: Enum.random(match.players)

      defp start_games(tournament) do
        new_matches =
          tournament
          |> get_matches
          |> Enum.map(fn match ->
            case match.state do
              "waiting" ->
                {:ok, fsm} =
                  Play.create_game(%{
                    level: tournament.difficulty,
                    tournament: tournament,
                    players: match.players
                  })

                %{match | game_id: FsmHelpers.get_game_id(fsm), state: "active"}

              _ ->
                match
            end
            |> Map.from_struct()
          end)

        tournament
        |> Tournament.changeset(%{
          data: DeepMerge.deep_merge(Map.from_struct(tournament.data), %{matches: new_matches})
        })
        |> Repo.update!()
      end

      defp update_match_params(match, %{state: "canceled"} = params), do: Map.merge(match, params)

      defp update_match_params(match, %{state: "finished"} = params) do
        %{
          winner: {winner_id, winner_result},
          loser: {loser_id, loser_result},
          started_at: started_at
        } = params

        new_duration = get_new_duration(started_at)

        new_players =
          Enum.map(match.players, fn player ->
            case player.id do
              ^winner_id -> Map.merge(player, %{game_result: winner_result})
              ^loser_id -> Map.merge(player, %{game_result: loser_result})
              _ -> player
            end
          end)

        Map.merge(match, %{players: new_players, duration: new_duration, state: "finished"})
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
