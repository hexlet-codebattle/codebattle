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

  def start_bot_server(game_id, user_id, fsm) do
    spec = {RecorderServer, {game_id, user_id, fsm} }
    DynamicSupervisor.start_child(String.to_atom("bot_server_#{game_id}_#{user_id}"), spec)
  end
end
