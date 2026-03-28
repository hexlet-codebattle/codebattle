defmodule Codebattle.GroupTaskToken do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.GroupTask
  alias Codebattle.User

  @type t :: %__MODULE__{}

  schema "group_task_tokens" do
    belongs_to(:user, User)
    belongs_to(:group_task, GroupTask)

    field(:token, :string)

    timestamps()
  end

  def changeset(group_task_token, attrs \\ %{}) do
    group_task_token
    |> cast(attrs, [:user_id, :group_task_id, :token])
    |> validate_required([:user_id, :group_task_id, :token])
    |> validate_length(:token, min: 16, max: 255)
    |> unique_constraint(:token)
    |> unique_constraint(:group_task_id, name: :group_task_tokens_user_id_group_task_id_index)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:group_task_id)
  end
end
