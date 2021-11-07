defmodule Codebattle.Game.Server do
  @moduledoc "Gen server for main game state"

  use GenServer

  require Logger

  alias Codebattle.Game.Game
  alias Codebattle.Bot.Playbook

  # API
  def start_link({game_id, game}) do
    GenServer.start_link(__MODULE__, game, name: server_name(game_id))
  end

  def update_playbook(game_id, event, params) do
    GenServer.cast(server_name(game_id), {:update_playbook, event, params})
  end

  def cast_transition(game_id, event, params) do
    GenServer.cast(server_name(game_id), {:transition, event, params})
  end

  def call_transition(game_id, event, params) do
    GenServer.call(server_name(game_id), {:transition, event, params})
  end

  def get_game(game_id) do
    case game_pid(game_id) do
      :undefined ->
        {:error, :game_terminated}

      _pid ->
        game = GenServer.call(server_name(game_id), :get_game)
        {:ok, game}
    end
  end

  def get_playbook(game_id) do
    case game_pid(game_id) do
      :undefined ->
        {:error, :game_terminated}

      _pid ->
        playbook = GenServer.call(server_name(game_id), :get_playbook)
        {:ok, playbook}
    end
  end

  def game_pid(game_id), do: :gproc.where(game_key(game_id))

  # SERVER
  def init(game) do
    Logger.info("Start game server for game_id: #{game.data.game_id}")

    state = %{
      game: game,
      playbook: Playbook.init(game)
    }

    {:ok, state}
  end

  def handle_cast({:update_playbook, event, params}, %{game: game, playbook: playbook}) do
    new_state = %{
      game: game,
      playbook: Playbook.add_event(playbook, event, params)
    }

    {:noreply, new_state}
  end

  def handle_cast({:transition, event, params}, %{game: game, playbook: playbook}) do
    new_state = %{
      game: Game.transition(game, event, [params]),
      playbook: Playbook.add_event(playbook, event, params)
    }

    {:noreply, new_state}
  end

  def handle_call(:get_playbook, _from, %{playbook: playbook} = state) do
    {:reply, playbook, state}
  end

  def handle_call(:get_game, _from, %{game: game} = state) do
    {:reply, game, state}
  end

  def handle_call({:transition, event, params}, _from, %{game: game, playbook: playbook} = state) do
    case Game.transition(game, event, [params]) do
      {{:error, reason}, _} ->
        {:reply, {:error, reason}, state}

      new_game ->
        new_state = %{
          game: new_game,
          playbook: Playbook.add_event(playbook, event, params)
        }

        {:reply, {:ok, new_game}, new_state}
    end
  end

  # HELPERS
  defp server_name(game_id), do: {:via, :gproc, game_key(game_id)}
  defp game_key(game_id), do: {:n, :l, {:game, "#{game_id}"}}
end
