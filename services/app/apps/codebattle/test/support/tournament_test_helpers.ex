defmodule Codebattle.TournamentTestHelpers do
  import Codebattle.Tournament.Helpers

  alias Codebattle.PubSub.Message

  def send_user_win_match(tournament, user, results \\ nil) do
    user_id = user.id

    [last_user_match] =
      tournament
      |> get_matches("playing")
      |> Enum.filter(&(user_id in &1.player_ids))

    %{game_id: game_id, id: ref, player_ids: player_ids} = last_user_match

    opponent_id = get_opponent(player_ids, user_id)

    player_results =
      case results do
        nil ->
          %{
            user_id => %{
              result: "won",
              id: user_id,
              lang: "js",
              result_percent: 100.0
            },
            opponent_id => %{
              result: "lost",
              id: opponent_id,
              lang: "js",
              result_percent: 50.0
            }
          }

        [result1, result2] ->
          %{user_id => result1, opponent_id => result2}
      end

    message =
      %Message{
        topic: "game:tournament:#{tournament.id}",
        event: "game:tournament:finished",
        payload: %{
          game_id: game_id,
          ref: ref,
          duration_sec: 15,
          game_state: "game_over",
          game_level: "easy",
          player_results: player_results
        }
      }

    Phoenix.PubSub.broadcast(Codebattle.PubSub, message.topic, message)
  end

  def get_opponent([id, o_id], id), do: o_id
  def get_opponent([o_id, id], id), do: o_id
end
