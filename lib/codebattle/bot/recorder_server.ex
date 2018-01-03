defmodule Codebattle.Bot.RecorderServer do
  @moduledoc "Gen server for calculating bot diffs and store it to database after player won the game"

  use GenServer
  require Logger
  alias Codebattle.Repo
  alias Codebattle.Bot.Playbook

  # API
  def start(game_id, task_id, user_id) do
    GenServer.start(__MODULE__, [game_id, task_id, user_id], name: server_name(game_id, user_id))
  end

  def update_text(game_id, user_id, text) do
    try do
      GenServer.cast(server_name(game_id, user_id), {:update_text, text})
    rescue
      e in FunctionClauseError -> e
    end
  end

  def update_lang(game_id, user_id, lang) do
    try do
      GenServer.cast(server_name(game_id, user_id), {:update_lang, lang})
    rescue
      e in FunctionClauseError -> e
    end
  end

  def store(game_id, user_id) do
    try do
      GenServer.cast(server_name(game_id, user_id), {:store})
    rescue
      e in FunctionClauseError -> e
    end
  end

  def recorder_pid(game_id, user_id) do
    :gproc.where(recorder_key(game_id, user_id))
  end

  # SERVER
  def init([game_id, task_id, user_id]) do
    Logger.info "Start bot recorder server for
      task_id: #{task_id},
      game_id: #{game_id},
      user_id: #{user_id}"
    {:ok, %{
      game_id: game_id,
      task_id: task_id,
      user_id: user_id,
      delta: TextDelta.new([]),
      lang: :js,
      time: nil,
      diff: [] #Array of diffs to db playbook
    }
    }
  end

  def handle_cast({:update_text, text}, state) do
    Logger.debug "#{__MODULE__} CAST update_text TEXT: #{inspect(text)}, STATE: #{inspect(state)}"
    time = state.time || NaiveDateTime.utc_now
    new_time = NaiveDateTime.utc_now
    new_delta = TextDelta.new |> TextDelta.insert(text)
    diff = %{
      delta: TextDelta.diff!(state.delta, new_delta).ops,
      time: NaiveDateTime.diff(new_time, time, :millisecond)
    }

    new_state =  %{state |
      delta: new_delta,
      diff: [diff | state.diff],
      time: new_time
    }

    {:noreply, new_state}
  end

  def handle_cast({:update_lang, lang}, state) do
    Logger.debug "#{__MODULE__} CAST update_lang LANG: #{inspect(lang)}, STATE: #{inspect(state)}"
    time = state.time || NaiveDateTime.utc_now
    new_time = NaiveDateTime.utc_now
    diff = %{
      lang: lang,
      time: NaiveDateTime.diff(new_time, time, :millisecond)
    }

    new_state =  %{state |
      lang: lang,
      diff: [diff | state.diff],
      time: new_time
    }

    {:noreply, new_state}
  end

  def handle_cast({:store}, state) do
    Logger.info "Store bot_playbook for
      task_id: #{state.task_id},
      game_id: #{state.game_id},
      user_id: #{state.user_id}"
    if state.user_id != 0 do
      %Playbook{
        data: %{playbook: state.diff |> Enum.reverse},
        lang: to_string(state.lang),
        task_id: state.task_id,
        user_id: state.user_id,
        game_id: state.game_id |> to_string |> Integer.parse |> elem(0)}
        |> Repo.insert
    end
    {:stop, :normal, state}
  end

  # HELPERS
  defp server_name(game_id, user_id) do
    {:via, :gproc, recorder_key(game_id, user_id)}
  end

  defp recorder_key(game_id, user_id) do
    key = [game_id, user_id] |> Enum.map(&to_charlist/1)
    {:n, :l, {:bot_recorder, key}}
  end
end

