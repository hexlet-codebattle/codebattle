defmodule Codebattle.Bot.Supervisor do
  # Automatically defines child_spec/1
  use DynamicSupervisor

  alias Codebattle.Bot.RecorderServer

  def start_link(game_id) do
    DynamicSupervisor.start_link(__MODULE__, game_id,
      name: String.to_atom("bot_server_#{game_id}")
    )
  end

  @impl true
  def init(_arg) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  def start_record_server(game_id, user, fsm) do
    spec = {RecorderServer, {game_id, user.id, fsm} }
    DynamicSupervisor.start_child(String.to_atom("bot_server_#{game_id}"), spec)
    # DynamicSupervisor.start_child(String.to_atom("bot_server_#{game_id}_#{user.id}"), spec)
  end
end
