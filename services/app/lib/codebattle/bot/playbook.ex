defmodule Codebattle.Bot.Playbook do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  alias Codebattle.Bot.Playbook
  alias Codebattle.Repo
  alias Codebattle.Game.{Play, GameHelpers}

  defmodule Data do
    use Ecto.Schema
    import Ecto.Changeset
    @primary_key false

    embedded_schema do
      field(:players, {:array, :map}, default: [])
      field(:records, {:array, :map}, default: [])
      field(:count, :integer)
    end

    def changeset(struct, params) do
      struct
      |> cast(params, [:players, :records, :count])
    end
  end

  @types ~w(complete incomplete waiting_moderator baned)

  schema "playbooks" do
    embeds_one(:data, Data, on_replace: :delete)
    field(:game_id, :integer)
    field(:winner_id, :integer)
    field(:winner_lang, :string)
    field(:solution_type, :string)

    belongs_to(:task, Codebattle.Task)

    timestamps()
  end

  @doc false
  def changeset(%Playbook{} = playbook, attrs) do
    playbook
    |> cast(attrs, [:game_id, :winner_id, :winner_lang, :solution_type, :task_id])
    |> cast_embed(:data)
    |> validate_required([
      :data,
      :game_id,
      :winner_id,
      :winner_lang,
      :solution_type,
      :task_id
    ])
    |> validate_inclusion(:solution_type, @types)
  end

  def random(task_id) do
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

  def init(_), do: []

  @events [
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

  def add_event(playbook, event, params)
      when event in @events do
    time = System.system_time(:millisecond)
    count = Enum.count(playbook)

    record =
      %{type: event}
      |> merge(event, params)
      |> Map.merge(%{time: time, record_id: count})

    [record | playbook]
  end

  def add_event(playbook, :join, %{players: players}) do
    Enum.reduce(players, playbook, fn player, acc ->
      data = %{
        id: player.id,
        name: player.name,
        editor_text: player.editor_text,
        editor_lang: player.editor_lang,
        check_result: %{result: "", output: ""}
      }

      add_event(acc, :init, data)
    end)
  end

  def add_event(playbook, _event, _params) do
    playbook
  end

  def store_playbook(playbook, game_id, task_id) do
    {:ok, fsm} = Play.get_fsm(game_id)
    data = create_final_game_playbook(playbook)
    winner = GameHelpers.get_winner(fsm)

    %Playbook{
      data: data,
      task_id: task_id,
      game_id: String.to_integer(to_string(game_id)),
      winner_id: winner && winner.id,
      winner_lang: winner && winner.id && winner.editor_lang,
      solution_type: get_solution_type(winner, fsm)
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

  defp merge(record, :check_complete, params) do
    new_params = Map.update!(params, :check_result, &Map.from_struct/1)
    Map.merge(record, new_params)
  end

  defp merge(record, _event, params), do: Map.merge(record, params)

  defp create_final_game_playbook(playbook) do
    init_data = %{records: [], players: [], count: 0}

    playbook
    |> Enum.reverse()
    |> Enum.reduce(init_data, &add_final_record/2)
    |> Map.update!(:records, &Enum.reverse/1)
  end

  defp add_final_record(%{type: :init} = record, data) do
    player_state = create_init_state(record)

    data |> add_player_state(player_state) |> update_history(record)
  end

  defp add_final_record(
         %{type: :update_editor_data, record_id: record_id, id: id, time: time} = record,
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

  defp add_final_record(record, data), do: update_history(data, record)

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

  defp create_init_state(record),
    do: Map.merge(record, %{type: :player_state, total_time_ms: 0})

  defp add_player_state(data, player_state),
    do: Map.update!(data, :players, &[player_state | &1])

  defp update_players_state(data, player_state),
    do: Map.update!(data, :players, &update_player(&1, player_state))

  defp update_player(players, %{id: id} = player_state),
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

  defp get_solution_type(winner, fsm) do
    case !!winner && GameHelpers.winner?(fsm, winner.id) do
      true -> "complete"
      false -> "incomplete"
    end
  end
end
