defmodule CodebattleWeb.Api.V1.TournamentController do
  use CodebattleWeb, :controller

  alias Codebattle.Tournament

  import Ecto.Query, warn: false

  def get_matches(
        conn,
        %{"tournament_id" => tournament_id, "player_id" => player_id}
      ) do
    matches =
      tournament_id
      |> Tournament.Context.get!()
      |> Tournament.Helpers.get_matches_by_players([String.to_integer(player_id)])

    json(conn, %{matches: matches})
  end

  # def get_tournaments(conn, params) do
  #   tournaments
  #     |> Tournament.Context.get_by_params!()
  #
  #   json(conn, %)
  # end
end
