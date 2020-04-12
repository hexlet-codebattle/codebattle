defmodule Codebattle.Bot.Player do
  @moduledoc """
  Process for playing playbooks of tasks and working with chat
  """
  use GenServer

  require Logger

  alias Codebattle.Bot.{ChatClient, PlaybookPlayer}

  @timeout_start_playbook Application.get_env(:codebattle, Codebattle.Bot.Server)[
                            :timeout_start_playbook
                          ]

  def start_link(%{game_id: game_id, bot_id: bot_id} = params) do
    GenServer.start(__MODULE__, params, name: server_name(game_id, bot_id))
  end

  def run!(%{game_id: game_id, bot_id: bot_id}) do
    GenServer.cast(server_name(game_id, bot_id), :run)
  end

  # SERVER

  def init(params) do
    Logger.info(
      "Start bot player server for game_id: #{inspect(params.game_id)}, and bot_id: #{
        inspect(params.game_id)
      }"
    )

    state =
      Map.merge(params, %{
        playbook_params: %{},
        chat_params: %{
          messages: [:hello, :announce, :about_code]
        }
      })

    {:ok, state}
  end

  def handle_cast(:run, state) do
    Process.send_after(self(), :send_message, 500)
    Process.send_after(self(), :init_playbook, @timeout_start_playbook)

    {:noreply, state}
  end

  def handle_info(:init_playbook, state) do
    case PlaybookPlayer.call(state) do
      :no_playbook ->
        ChatClient.say_some_excuse(state.chat_channel)
        {:noreply, state}

      playbook_params ->
        send(self(), :update_solution)
        new_state = Map.put(state, :playbook_params, playbook_params)

        {:noreply, new_state}
    end
  end

  def handle_info(:send_message, state) do
    messages = state.chat_params.messages

    case ChatClient.call(messages, state) do
      {new_messages, timeout} ->
        Process.send_after(self(), :send_message, timeout)
        new_state = update_messages(state, new_messages)

        {:noreply, new_state}

      :stop ->
        {:noreply, state}
    end
  end

  def handle_info(:update_solution, state) do
    case PlaybookPlayer.update_solution(state) do
      {new_playbook_params, timeout} ->
        Process.send_after(self(), :update_solution, timeout)
        new_state = Map.put(state, :playbook_params, new_playbook_params)

        {:noreply, new_state}

      :stop ->
        {:noreply, state}
    end
  end

  def update_messages(state, messages) do
    new_chat_params = Map.put(state.chat_params, :messages, messages)
    Map.put(state, :chat_params, new_chat_params)
  end

  defp server_name(game_id, bot_id) do
    {:via, :gproc, game_key(game_id, bot_id)}
  end

  defp game_key(game_id, bot_id) do
    {:n, :l, {:bot_player, "#{game_id}__#{bot_id}"}}
  end
end
