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
    field(:reply, :string)
    field(:replied_at, :naive_datetime)

    timestamps()
  end

  @doc false
  def changeset(%Feedback{} = feedback, attrs) do
    feedback
    |> cast(attrs, [:user_id, :author_name, :status, :text, :title_link])
    |> validate_required([:author_name, :status, :text, :title_link])
    |> validate_length(:text, max: 10_000)
  end

  def update_changeset(%Feedback{} = feedback, attrs) do
    feedback
    |> cast(attrs, [:status, :text, :title_link])
    |> validate_length(:text, max: 10_000)
  end

  @doc "Feedback visible to `user`: everything for admins, their own otherwise (newest first)."
  def visible_to(user) do
    if Codebattle.User.admin?(user) do
      from(f in Feedback, order_by: [desc: f.id])
    else
      by_author(user.id)
    end
  end

  def by_author(user_id) do
    from(f in Feedback, where: f.user_id == ^user_id, order_by: [desc: f.id])
  end

  def publish_reply(id, reply) do
    reply = String.trim(reply)

    if String.length(reply) in 1..10_000 do
      now = NaiveDateTime.utc_now(:second)
      query = from(f in Feedback, where: f.id == ^id and not is_nil(f.user_id) and is_nil(f.reply))

      case Repo.update_all(query, set: [reply: reply, replied_at: now, updated_at: now]) do
        {1, _} -> :ok
        {0, _} -> {:error, :unavailable}
      end
    else
      {:error, :invalid_reply}
    end
  end

  def list_all do
    Repo.all(from(f in Feedback, order_by: [desc: f.inserted_at]))
  end
end
