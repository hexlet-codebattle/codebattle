defmodule Codebattle.Bot.Playbook do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  alias Codebattle.Bot.Playbook
  alias Codebattle.Repo
  alias Codebattle.GameProcess.{Play, FsmHelpers}

  defmodule Data do
    use Ecto.Schema
    import Ecto.Changeset
    @primary_key false

    embedded_schema do
      field(:players, :map, default: %{})
      field(:records, {:array, :map}, default: [])
      field(:count, :integer)
    end

    def changeset(struct, params) do
      struct
      |> cast(params, [:players, :records, :count])
    end
  end

  schema "playbooks" do
    embeds_one(:data, Data)
    field(:game_id, :integer)
    field(:winner_id, :integer)
    field(:winner_lang, :string)

    belongs_to(:task, Codebattle.Task)

    timestamps()
  end

  @doc false
  def changeset(%Playbook{} = playbook, attrs) do
    playbook
    |> cast(attrs, [:data, :game_id, :winner_id, :winner_lang, :task_id])
    |> validate_required([:data, :game_id, :winner_id, :winner_lang, :task_id])
  end

  def random(task_id) do
    from(
      p in Playbook,
      where: not is_nil(p.winner_id) and p.task_id == ^task_id,
      order_by: fragment("RANDOM()"),
      limit: 1
    )
    |> Repo.one()
  end

  def init(_), do: []

  @events [
    :join_chat,
    :leave_chat,
    :chat_message,
    :init,
    :update_editor_params,
    :give_up,
    :start_check,
    :complete
  ]

  def add_event(playbook, event, params)
      when event in @events do
    time = NaiveDateTime.utc_now()

    record =
      {event, params}
      |> create_record
      |> Map.merge(params)
      |> Map.merge(%{time: time})

    [record | playbook]
  end

  def add_event(playbook, :join, %{players: players}) do
    Enum.reduce(players, playbook, &add_player_init_state/2)
  end

  def add_event(playbook, _event, _params) do
    playbook
  end

  def store_playbook(playbook, game_id, task_id) do
    {:ok, fsm} = Play.get_fsm(game_id)
    data = create_final_game_playbook(playbook)
    winner = FsmHelpers.get_winner(fsm)

    %Playbook{
      data: data,
      task_id: task_id,
      game_id: String.to_integer(game_id),
      winner_id: winner.id,
      winner_lang: winner.id && winner.editor_lang
    }
    |> Repo.insert()
  end

  def update_stored_playbook(playbook, game) do
    params = %{
      data: create_final_game_playbook(playbook)
    }

    Playbook
    |> Repo.get_by!(game_id: game.id)
    |> Playbook.changeset(params)
  end

  defp create_record({:update_editor_params, %{editor_lang: _}}),
    do: %{type: :editor_lang}

  defp create_record({:update_editor_params, %{editor_text: _}}),
    do: %{type: :editor_text}

  defp create_record({:update_editor_params, %{result: _, output: _}}),
    do: %{type: :result_check}

  defp create_record({:complete, _params}),
    do: %{type: :check_complete}

  defp create_record({type, _params}),
    do: %{type: type}

  defp add_player_init_state(player, playbook) do
    add_event(playbook, :init, %{
      id: player.id,
      editor_text: player.editor_text,
      editor_lang: player.editor_lang
    })
  end

  defp create_final_game_playbook(playbook) do
    init_data = %{records: [], players: %{}, count: 0}

    playbook
    |> Enum.reverse()
    |> Enum.reduce(init_data, &add_final_record/2)
    |> Map.update!(:records, &Enum.reverse/1)
  end

  defp add_final_record(%{type: :init} = record, data) do
    player_state = create_init_state(record)

    update_data(data, player_state, record)
  end

  defp add_final_record(%{type: type, id: id, time: time} = record, data)
       when type in [:editor_text, :editor_lang] do
    player_state = Map.get(data.players, id)
    diff = create_diff(type, player_state, record)
    new_player_state = update_editor_state(player_state, record, diff.time)
    new_record = %{type: type, id: id, diff: diff, time: time}

    update_data(data, new_player_state, new_record)
  end

  defp add_final_record(record, data), do: update_history(data, record)

  defp update_data(data, player_state, record),
    do: data |> update_players_state(player_state) |> update_history(record)

  defp create_diff(:editor_lang, player_state, %{time: time, editor_lang: lang}),
    do: %{
      prev_lang: player_state.editor_lang,
      next_lang: lang,
      time: time_diff(time, player_state.time)
    }

  defp create_diff(:editor_text, player_state, %{time: time, editor_text: text}) do
    player_state_delta = create_delta(player_state.editor_text)
    new_delta = create_delta(text)

    %{
      delta: TextDelta.diff!(player_state_delta, new_delta).ops,
      time: time_diff(time, player_state.time)
    }
  end

  defp create_init_state(record),
    do: record |> Map.put(:type, :player_state) |> Map.put_new(:total_time_ms, 0)

  defp update_players_state(data, %{id: id} = player_state),
    do: Map.update!(data, :players, &Map.put(&1, id, player_state))

  defp update_editor_state(player_state, %{type: type, time: time} = record, diff_time),
    do:
      player_state
      |> Map.put(type, record[type])
      |> Map.put(:time, time)
      |> Map.update!(:total_time_ms, &(&1 + diff_time))

  defp update_history(data, record),
    do: Map.update!(data, :records, &[record | &1]) |> increase_count

  defp create_delta(text), do: TextDelta.new() |> TextDelta.insert(text)

  defp time_diff(new_time, time), do: NaiveDateTime.diff(new_time, time, :millisecond)

  defp increase_count(data), do: Map.update!(data, :count, &(&1 + 1))
end
