defmodule Codebattle.Playbook.Context do
  import Ecto.Query
  require Logger

  alias Codebattle.Playbook
  alias Codebattle.Repo
  alias Codebattle.Game

  @record_types [
    :join_chat,
    :leave_chat,
    :chat_message,
    :init,
    :give_up,
    :update_editor_data,
    :start_check,
    :check_complete,
    :game_over
  ]

  def get_random_completed(task_id) do
    from(
      p in Playbook,
      where:
        not is_nil(p.winner_id) and
          p.task_id == ^task_id and
          p.solution_type == "complete",
      order_by: fragment("RANDOM()"),
      limit: 1
    )
    |> Repo.one()
  end

  def exists?(game_id) do
    from(
      p in Playbook,
      where: p.game_id == ^game_id,
      limit: 1
    )
    |> Repo.one()
  end

  def init_records(players) do
    records =
      players
      |> Enum.with_index()
      |> Enum.map(fn {player, index} ->
        %{
          record_id: index,
          type: :init,
          time: System.system_time(:millisecond),
          id: player.id,
          name: player.name,
          editor_text: player.editor_text,
          editor_lang: player.editor_lang,
          check_result: %{result: "", output: ""}
        }
      end)
      |> Enum.reverse()

    %{records: records, id: Enum.count(records)}
  end

  def add_record(playbook_state, type, params) when type in @record_types do
    record =
      %{
        type: type,
        record_id: playbook_state.id,
        time: System.system_time(:millisecond)
      }
      |> Map.merge(params)

    playbook_state
    |> Map.update!(:records, &[record | &1])
    |> Map.update!(:id, &(&1 + 1))
  end

  def add_record(playbook_state, :check_success, _params), do: playbook_state
  def add_record(playbook_state, :check_failure, _params), do: playbook_state
  def add_record(playbook_state, :timeout, _params), do: playbook_state
  def add_record(playbook_state, :rematch_send_offer, _params), do: playbook_state
  def add_record(playbook_state, :rematch_reject, _params), do: playbook_state
  def add_record(playbook_state, :join, _params), do: playbook_state

  def add_record(playbook_state, type, params) do
    Logger.error("Unknown playbook record type: #{type}, params: #{inspect(params)}")
    playbook_state
  end

  def store_playbook(playbook_records, game_id) do
    game = Game.Context.get_game!(game_id)
    winner = Game.Helpers.get_winner(game)
    task_id = Game.Helpers.get_task(game).id
    data = build_playbook_data(playbook_records)

    %Playbook{
      data: data,
      task_id: task_id,
      game_id: String.to_integer(to_string(game_id)),
      winner_id: winner && winner.id,
      winner_lang: winner && winner.editor_lang,
      solution_type: get_solution_type(winner, game)
    }
    |> Repo.insert()
  end

  defp build_playbook_data(playbook_records) do
    init_data = %{records: [], players: [], count: 0}

    playbook_records
    |> Enum.reverse()
    |> Enum.reduce(init_data, &add_record_to_playbook_data/2)
    |> Map.update!(:records, &Enum.reverse/1)
    |> Map.update!(:players, &Enum.reverse/1)
  end

  defp add_record_to_playbook_data(record = %{type: :init}, data) do
    player = Map.merge(record, %{type: :player_state, total_time_ms: 0})

    data
    |> Map.update!(:players, &[player | &1])
    |> update_history(record)
  end

  defp add_record_to_playbook_data(
         record = %{type: :update_editor_data, record_id: record_id, id: id, time: time},
         data
       ) do
    player_state = Enum.find(data.players, &(&1.id == id))
    diff = create_diff(player_state, record)
    new_player_state = update_editor_state(player_state, record, diff.time)

    new_record = %{
      type: :update_editor_data,
      record_id: record_id,
      id: id,
      diff: diff,
      time: time
    }

    data |> update_players_state(new_player_state) |> update_history(new_record)
  end

  defp add_record_to_playbook_data(record, data), do: update_history(data, record)

  defp create_diff(player_state, %{time: time, editor_text: text, editor_lang: editor_lang}) do
    player_state_delta = create_delta(player_state.editor_text)
    new_delta = create_delta(text)

    lang_delta =
      if player_state.editor_lang == editor_lang do
        %{}
      else
        %{next_lang: editor_lang}
      end

    %{
      delta: TextDelta.diff!(player_state_delta, new_delta).ops,
      time: time - player_state.time
    }
    |> Map.merge(lang_delta)
  end

  defp update_players_state(data, player_state),
    do: Map.update!(data, :players, &update_player(&1, player_state))

  defp update_player(players, player_state = %{id: id}),
    do:
      Enum.map(players, fn
        %{id: ^id} -> player_state
        player -> player
      end)

  defp update_editor_state(
         player_state,
         %{time: time, editor_text: editor_text, editor_lang: editor_lang},
         diff_time
       ),
       do:
         player_state
         |> Map.put(:editor_text, editor_text)
         |> Map.put(:editor_lang, editor_lang)
         |> Map.put(:time, time)
         |> Map.update!(:total_time_ms, &(&1 + diff_time))

  defp update_history(data, record),
    do: Map.update!(data, :records, &[record | &1]) |> increase_count

  defp create_delta(text), do: TextDelta.new() |> TextDelta.insert(text)

  defp increase_count(data), do: Map.update!(data, :count, &(&1 + 1))

  defp get_solution_type(nil, game), do: "incomplete"

  defp get_solution_type(winner, game) do
    has_winner = Game.Helpers.winner?(game, winner.id)
    opponent = Game.Helpers.get_opponent(game, winner.id)
    has_loser = Game.Helpers.lost?(game, opponent.id)

    if has_winner && has_loser do
      "complete"
    else
      "incomplete"
    end
  end
end
