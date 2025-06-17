defmodule CodebattleWeb.ExtApi.TournamentController do
  use CodebattleWeb, :controller

  import Plug.Conn

  alias Codebattle.Tournament

  plug(CodebattleWeb.Plugs.TokenAuth)

  @json_files ~w(
    /json/tournament_state_round1.json
    /json/tournament_state_round2.json
    /json/tournament_state_round3.json
    /json/tournament_state_round4.json
    /json/tournament_state_round5.json
    /json/tournament_state_round6.json
    /json/tournament_state_round7.json
    /json/tournament_state_round8.json
    /json/tournament_state_round9.json
    /json/tournament_state_round10.json
    /json/tournament_state_round11.json
    /json/tournament_state_round12.json
    /json/tournament_state_round13.json
    /json/tournament_state_round14.json
  )

  # -------------------------------------------------
  # Simple in-memory index so every call rotates file
  # -------------------------------------------------
  def start_link, do: Agent.start_link(fn -> 0 end, name: __MODULE__)
  defp ensure_agent_started, do: Process.whereis(__MODULE__) || start_link()

  # ---------------
  # GET /ext_api...
  # ---------------
  def show(conn, %{"base_url" => base_url}) do
    ensure_agent_started()

    idx =
      Agent.get_and_update(__MODULE__, fn i ->
        {i, rem(i + 1, length(@json_files))}
      end)

    url = base_url <> Enum.at(@json_files, idx)

    case Req.get(url, decode_body: false) do
      {:ok, %{status: 200, body: body}} ->
        conn
        |> put_resp_content_type("application/json")
        |> send_resp(200, body)

      {:ok, %{status: status}} ->
        conn
        |> put_status(:bad_gateway)
        |> json(%{error: "Failed to retrieve JSON", status: status})

      {:error, reason} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{error: "Error fetching JSON: #{inspect(reason)}"})
    end
  end

  def show(conn, %{"id" => id}) do
    tournament = Tournament.Context.get(id)

    stats = Tournament.Helpers.get_player_ranking_stats(tournament)

    conn
    |> put_resp_content_type("application/json")
    |> json(stats)
  end
end
