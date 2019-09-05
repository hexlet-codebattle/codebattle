defmodule Codebattle.Tournament.Server do
  def start(tournament) do
    GenServer.start(__MODULE__, [tournament], name: taournament_key(tournament.id))
  end

  # API
  def add_message(id, user, msg) do
    GenServer.cast(taournament_key(id), {:add_message, user, msg})
  end

  def get_messages(id) do
    try do
      GenServer.call(taournament_key(id), :get_messages)
    catch
      :exit, _reason ->
        []
    end
  end

  def update_tournament(id, event_type, params) do
    GenServer.call(taournament_key(id), {:update_tournament, id, event_type, params})
  end

  # SERVER
  def init(tournament) do
    {:ok, %{tournament: tournament, messages: []}}
  end

  def handle_call({:update_tournament, id, "game:cancel", params}, _from, state) do
    tournament =
      id
      |> Codebattle.Tournament.get!()
      |> Codebattle.Tournament.Helpers.update_match(params.game_id, %{state: "canceled"})
      |> Codebattle.Tournament.Helpers.maybe_start_new_step()

    {:reply, tournament, state}
  end

  def handle_call({:update_tournament, id, "game:finished", params}, _from, state) do
    tournament =
      id
      |> Codebattle.Tournament.get!()
      |> Codebattle.Tournament.Helpers.update_match(
        params.game_id,
        Map.merge(params, %{state: "finished"})
      )
      |> Codebattle.Tournament.Helpers.maybe_start_new_step()

    {:reply, tournament, state}
  end

  def handle_call(:get_messages, _from, state) do
    %{messages: messages} = state
    {:reply, Enum.reverse(messages), state}
  end

  def handle_cast({:add_message, user, msg}, state) do
    %{messages: messages} = state
    new_msgs = [%{user_name: user.name, message: msg} | messages]
    {:noreply, %{state | messages: new_msgs}}
  end

  # HELPERS
  defp taournament_key(id) do
    {:via, :gproc, {:n, :l, {:tournament, "#{id}"}}}
  end
end
