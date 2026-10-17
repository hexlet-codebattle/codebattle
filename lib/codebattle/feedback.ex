defmodule Codebattle.Feedback do
  @moduledoc """
    Represents codebattle users feedback about service
  """

  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Feedback
  alias Codebattle.Repo

  @derive {Jason.Encoder, only: [:id, :user_id, :author_name, :status, :text, :title_link, :inserted_at]}

  schema "feedback" do
    belongs_to(:user, Codebattle.User)
    field(:author_name, :string)
    field(:status, :string)
    field(:text, :string)
    field(:title_link, :string)

    timestamps()
  end

  @doc false
  def changeset(%Feedback{} = feedback, attrs) do
    feedback
    |> cast(attrs, [:user_id, :author_name, :status, :text, :title_link])
    |> validate_required([:author_name, :status, :text, :title_link])
    |> validate_length(:text, max: 10_000)
  end

  def list_all do
    Repo.all(from(f in Feedback, order_by: [desc: f.inserted_at]))
  end

  @doc "Feedback visible to `user`: everything for admins, their own otherwise (newest first)."
  def visible_to(user) do
    query = from(f in Feedback, order_by: [desc: f.id])

    if Codebattle.User.admin?(user) do
      query
    else
      where(query, [f], f.user_id == ^user.id)
    end
  end
end
