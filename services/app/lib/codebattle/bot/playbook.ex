defmodule Codebattle.Bot.Playbook do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  alias Codebattle.Bot.Playbook

  schema "bot_playbooks" do
    field(:data, :map)
    field(:user_id, :integer)
    field(:game_id, :integer)
    field(:task_id, :integer)
    # TODO: add to lang_id instead slug
    field(:lang, :string)

    timestamps()
  end

  @doc false
  def changeset(%Playbook{} = playbook, attrs) do
    playbook
    |> cast(attrs, [:data, :user_id, :game_id, :task_id, :lang])
    |> validate_required([:data, :user_id, :game_id, :task_id, :lang])
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
end
