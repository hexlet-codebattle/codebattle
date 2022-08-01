defmodule Codebattle.Playbook do
  use Ecto.Schema

  import Ecto.Changeset

  @solution_types ~w(complete incomplete waiting_moderator baned)

  schema "playbooks" do
    field(:game_id, :integer)
    field(:winner_id, :integer)
    field(:winner_lang, :string)
    field(:solution_type, :string)

    belongs_to(:task, Codebattle.Task)

    embeds_one :data, Data, on_replace: :update, primary_key: false do
      field(:players, {:array, AtomizedMap}, default: [])
      field(:records, {:array, AtomizedMap}, default: [])
      field(:count, :integer)
    end

    timestamps()
  end

  @doc false
  def changeset(%Playbook{} = playbook, attrs) do
    playbook
    |> cast(attrs, [:game_id, :winner_id, :winner_lang, :solution_type, :task_id])
    |> validate_required([
      :game_id,
      :winner_id,
      :winner_lang,
      :solution_type,
      :task_id
    ])
    |> validate_inclusion(:solution_type, @solution_types)
    |> cast_embed(:data, with: &data_changeset/2, required: true)
  end

  defp data_changeset(data, params) do
    cast(data, params, [:players, :records, :count])
  end
end
