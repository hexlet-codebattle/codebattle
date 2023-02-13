defmodule Codebattle.Feedback do
  @moduledoc """
    Represents codebattle users feedback about service
  """

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.Feedback

  @derive {Jason.Encoder, only: [:id, :author_name, :status, :text, :title_link, :inserted_at]}

  schema "feedback" do
    field(:author_name, :string)
    field(:status, :string)
    field(:text, :string)
    field(:title_link, :string)

    timestamps()
  end

  @doc false
  def changeset(feedback = %Feedback{}, attrs) do
    feedback
    |> cast(attrs, [:author_name, :status, :text, :title_link])
    |> validate_required([:author_name, :status, :text, :title_link])
  end

  def get_all() do
    from(
      f in Feedback,
      order_by: [desc: f.inserted_at]
    )
    |> Repo.all()
    |> Enum.map(&format_feedback/1)
  end

  def format_feedback(%Feedback{
        id: id,
        author_name: name,
        status: status,
        text: text,
        title_link: link,
        inserted_at: inserted_at
      }) do
    pub_date = Calendar.strftime(inserted_at, "%a, %d %B %Y %H:%M:%S GMT")

    %{
      title: status <> " " <> name,
      description: text,
      pubDate: pub_date,
      link: link,
      guid: id
    }
  end
end
