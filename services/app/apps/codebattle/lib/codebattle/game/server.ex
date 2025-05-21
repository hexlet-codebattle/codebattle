defmodule Codebattle.Game.Server do
  @moduledoc "Gen server for main game state"

  use GenServer

  alias Codebattle.Game
  alias Codebattle.Game.Engine
  alias Codebattle.Playbook

  require Logger

  # API
  def start_link(game) do
    GenServer.start_link(__MODULE__, game, name: server_name(game.id))
  end

  def get_game(game_id) do
    game = GenServer.call(server_name(game_id), :get_game)
    {:ok, game}
  catch
    :exit, _reason -> {:error, :not_found}
  end

  def get_playbook_records(game_id) do
    records = GenServer.call(server_name(game_id), :get_playbook_records)
    {:ok, records}
  catch
    :exit, _reason -> {:error, :not_found}
  end

  def fire_transition(game_id, event, params \\ %{})

  def fire_transition(game_id, event, params) do
    GenServer.call(server_name(game_id), {:transition, event, params})
  end

  def init_playbook(game_id) do
    GenServer.cast(server_name(game_id), :init_playbook)
  end

  def update_playbook(game_id, type, params) do
    GenServer.cast(server_name(game_id), {:update_playbook, type, params})
  end

  # SERVER
  @impl GenServer
  def init(game) do
    Logger.debug("Start game server for game_id: #{game.id}")

    state = %{
      game: game,
      is_record_games: !FunWithFlags.enabled?(:skip_record_games),
      playbook_state: %{records: [], id: 0}
    }

    {:ok, state}
  end

  @impl GenServer
  def handle_cast(:init_playbook, state) do
    %{game: game} = state

    {:noreply,
     %{
       state
       | playbook_state: Playbook.Context.init_records(game.players)
     }}
  end

  @impl GenServer
  def handle_cast({:update_playbook, type, params}, state) do
    %{playbook_state: playbook_state} = state

    {:noreply,
     %{
       state
       | playbook_state: Playbook.Context.add_record(playbook_state, type, params)
     }}
  end

  @impl GenServer
  def handle_call(:get_playbook_records, _from, state) do
    {:reply, state.playbook_state.records, state}
  end

  @impl GenServer
  def handle_call(:get_game, _from, state) do
    {:reply, state.game, state}
  end

  @impl GenServer
  def handle_call({:transition, event, params}, _from, state) do
    %{game: game, playbook_state: playbook_state, is_record_games: is_record_games} = state

    case Game.Fsm.transition(event, game, params) do
      {:error, reason} ->
        {:reply, {:error, reason}, state}

      {:ok, %Game{} = new_game} ->
        if is_record_games do
          {:reply, {:ok, {game.state, new_game}},
           %{
             state
             | game: new_game,
               playbook_state: Playbook.Context.add_record(playbook_state, event, params)
           }}
        else
          {:reply, {:ok, {game.state, new_game}}, %{state | game: new_game}}
        end
    end
  end

  defp server_name(game_id), do: {:via, Registry, {Codebattle.Registry, "game_srv:#{game_id}"}}

  @impl GenServer
  def handle_info({:code_check_result, check_result, user, editor_text, editor_lang}, state) do
    %{game: game} = state

    Codebattle.PubSub.broadcast("game:check_completed", %{
      game: game,
      user_id: user.id,
      check_result: check_result
    })

    # Update playbook for the check completion
    GenServer.cast(self(), {:update_playbook, :check_complete, %{
      id: user.id,
      check_result: check_result,
      editor_text: editor_text, # Consider if editor_text is needed here
      editor_lang: editor_lang
    }})

    case check_result.status do
      "ok" ->
        case GenServer.call(self(), {:transition, :check_success, %{id: user.id, check_result: check_result, editor_text: editor_text, editor_lang: editor_lang}}) do
          {:ok, {old_game_state, new_game_from_transition}} ->
            new_state = %{state | game: new_game_from_transition}

            case {old_game_state, new_game_from_transition.state} do
              {"playing", "game_over"} ->
                GenServer.cast(self(), {:update_playbook, :game_over, %{id: user.id, lang: editor_lang}})
                Codebattle.PubSub.broadcast("game:finished", %{game: new_game_from_transition})
                Engine.store_result!(new_game_from_transition)
                Engine.store_playbook_async(new_game_from_transition)
                {:noreply, new_state}

              _ ->
                {:noreply, new_state}
            end
          {:error, reason} ->
            Logger.error("Failed to transition game state on check_success: #{inspect(reason)}")
            {:noreply, state}
        end

      _ -> # Any other status is a failure
        case GenServer.call(self(), {:transition, :check_failure, %{id: user.id, check_result: check_result, editor_text: editor_text, editor_lang: editor_lang}}) do
          {:ok, {_old_game_state, new_game_from_transition}} ->
             new_state = %{state | game: new_game_from_transition}
            {:noreply, new_state}
          {:error, reason} ->
            Logger.error("Failed to transition game state on check_failure: #{inspect(reason)}")
            {:noreply, state}
        end
    end
  end

  @impl GenServer
  def handle_info({:code_check_error, error_details, user, _editor_text, _editor_lang}, state) do
    %{game: game} = state

    Logger.error("Code check failed for game #{game.id}, user #{user.id}: #{inspect(error_details)}")

    Codebattle.PubSub.broadcast("game:check_failed", %{
      game: game,
      user_id: user.id,
      error: :internal_error # Or more specific error if available
    })

    # Potentially transition game to an error state or allow user to retry
    # For now, just log and broadcast
    {:noreply, state}
  end
end
