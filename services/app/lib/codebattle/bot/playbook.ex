defmodule Codebattle.Bot.Playbook do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  alias Codebattle.Bot.Playbook

  schema "bot_playbooks" do
    field(:data, :map)
    field(:user_id, :integer)
    field(:game_id, :integer)
    field(:lang, :string)

    belongs_to(:task, Codebattle.Task)

    timestamps()
  end

  @doc false
  def changeset(%Playbook{} = playbook, attrs) do
    playbook
    |> cast(attrs, [:data, :user_id, :game_id, :task_id, :lang, :level])
    |> validate_required([:data, :user_id, :game_id, :task_id, :lang, :level])
  end

  def random(task_id) do
    try do
      {:ok, query} =
        Ecto.Adapters.SQL.query(
          Codebattle.Repo,
          "SELECT * from bot_playbooks WHERE task_id = $1 ORDER BY RANDOM() LIMIT 1",
          [task_id]
        )

      %Postgrex.Result{rows: [[id | [diff | _tail]]]} = query
      {id, diff}
    rescue
      _e in MatchError -> nil
    end
  end

  def init(_), do: []

  @events [
    :join_chat,
    :leave_chat,
    :add_chat_message,
    :update_editor_params,
    :give_up,
    :check_solution,
    :complete
  ]

  def add_event(
        playbook,
        event,
        %{id: user_id} = params
      )
      when event in @events do
    time = NaiveDateTime.utc_now()

    record =
      {event, params}
      |> create_record
      |> Map.merge(%{"user_id" => user_id, "time" => time})

    [record | playbook]
  end

  def add_event(playbook, _event, _params) do
    playbook
  end

  defp create_record({:join_chat, %{name: name}}),
    do: %{"type" => "join_chat", "name" => name}

  defp create_record({:leave_chat, %{name: name}}),
    do: %{"type" => "leave_chat", "name" => name}

  defp create_record({:add_chat_message, %{name: name, message: message}}),
    do: %{"type" => "chat_message", "name" => name, "message" => message}

  defp create_record({:update_editor_params, %{editor_lang: editor_lang}}),
    do: %{"type" => "editor_lang", "editor_lang" => editor_lang}

  defp create_record({:update_editor_params, %{editor_text: editor_text}}),
    do: %{"type" => "editor_text", "editor_text" => editor_text}

  defp create_record({:update_editor_params, %{result: result, output: output}}),
    do: %{"type" => "result_check", "result" => result, "output" => output}

  defp create_record({:give_up, _params}),
    do: %{"type" => "give_up"}

  defp create_record({:check_solution, %{editor_text: editor_text, editor_lang: editor_lang}}),
    do: %{"type" => "start_check", "editor_text" => editor_text, "editor_lang" => editor_lang}

  defp create_record({:complete, _params}),
    do: %{"type" => "game_complete"}
end
