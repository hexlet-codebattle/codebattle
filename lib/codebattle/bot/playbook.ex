defmodule Codebattle.Bot.Playbook do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  alias Codebattle.Bot.Playbook

  schema "bot_playbooks" do
    field :data, :map
    field :user_id, :integer
    field :game_id, :integer
    field :task_id, :integer
    field :language_id, :integer

    timestamps()
  end

  @doc false
  def changeset(%Playbook{} = playbook, attrs) do
    playbook
    |> cast(attrs, [:data, :user_id, :game_id, :inserted_at])
    |> validate_required([:data, :user_id, :game_id])
  end
end
