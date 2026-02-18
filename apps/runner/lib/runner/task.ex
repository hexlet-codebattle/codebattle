defmodule Runner.Task do
  @moduledoc false
  use Ecto.Schema

  import Ecto.Changeset

  alias Runner.AtomizedMap

  @derive Jason.Encoder

  @type t :: %__MODULE__{}

  @required_experiment_fields [:type]
  @required_fields [:type, :input_signature, :output_signature, :asserts, :asserts_examples]
  @all_experiment_fields [:type]
  @all_fields @required_fields ++ [:comment]
  @experiment_types ["css", "sql"]

  @primary_key false
  embedded_schema do
    field(:type, :string, default: "algorithms")
    field(:comment, :string, default: "use stdout to debug")
    field(:input_signature, {:array, AtomizedMap}, default: [])
    field(:output_signature, AtomizedMap, default: %{})
    field(:asserts, {:array, AtomizedMap}, default: [])
    field(:asserts_examples, {:array, AtomizedMap}, default: [])
  end

  @spec new!(params :: map()) :: t()
  def new!(%_{} = params), do: params |> Map.from_struct() |> new!()

  def new!(%{type: experiment_type} = params) when experiment_type in @experiment_types do
    %__MODULE__{}
    |> cast(params, @all_experiment_fields)
    |> validate_required(@required_experiment_fields)
    |> apply_action!(:validate)
  end

  def new!(params) do
    %__MODULE__{}
    |> cast(params, @all_fields)
    |> validate_required(@required_fields)
    |> apply_action!(:validate)
  end
end
