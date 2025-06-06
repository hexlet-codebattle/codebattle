defmodule CodebattleWeb.ExtApi.TournamentController do
  use CodebattleWeb, :controller

  import Plug.Conn

  plug(CodebattleWeb.Plugs.TokenAuth)

  # Define the JSON file paths
  @json_files [
    "/json/tournament_state_round1.json",
    "/json/tournament_state_round2.json",
    "/json/tournament_state_round3.json",
    "/json/tournament_state_round4.json",
    "/json/tournament_state_round5.json",
    "/json/tournament_state_round6.json",
    "/json/tournament_state_round7.json"
  ]

  # Use an Agent to store the current index
  def start_link do
    Agent.start_link(fn -> 0 end, name: __MODULE__)
  end

  # Initialize the Agent when the application starts
  def init do
    if !Process.whereis(__MODULE__), do: start_link()
  end

  def show(conn, %{"base_url" => base_url} = _params) do
    # Initialize the agent if it doesn't exist
    init()

    # Get current index and update it for the next request
    current_index =
      Agent.get_and_update(__MODULE__, fn index ->
        next_index = rem(index + 1, length(@json_files))
        {index, next_index}
      end)

    # Get the current JSON file path
    json_path = Enum.at(@json_files, current_index)

    # Construct the full URL
    redirect_url = "#{base_url}#{json_path}"

    # Redirect to the S3 bucket URL
    redirect(conn, external: redirect_url)
  end

  def show(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: "Missing base_url parameter"})
  end
end
