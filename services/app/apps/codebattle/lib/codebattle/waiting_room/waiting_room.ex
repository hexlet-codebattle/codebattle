defmodule Codebattle.WaitingRoom do
  alias Codebattle.WaitingRoom.Server

  defdelegate start_link(params), to: Server
  defdelegate start(name, played_pair_ids), to: Server
  defdelegate put_players(name, players), to: Server
  defdelegate get_state(name), to: Server
  defdelegate match_players(name), to: Server
  defdelegate update_state(name, params), to: Server
end
