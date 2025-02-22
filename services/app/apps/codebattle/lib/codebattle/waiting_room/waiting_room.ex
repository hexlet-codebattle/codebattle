defmodule Codebattle.WaitingRoom do
  @moduledoc false
  alias Codebattle.WaitingRoom.Server

  defdelegate delete_player(name, player_id), to: Server
  defdelegate get_state(name), to: Server
  defdelegate match_players(name), to: Server
  defdelegate pause(name), to: Server
  defdelegate put_player(name, player), to: Server
  defdelegate put_players(name, players), to: Server
  defdelegate start(name, played_pair_ids), to: Server
  defdelegate start_link(params), to: Server
  defdelegate update_state(name, params), to: Server
end
