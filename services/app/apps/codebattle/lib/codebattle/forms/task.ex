defmodule Codebattle.TaskForm do
  @moduledoc false

  import Ecto.Changeset

  alias Codebattle.Repo
  alias Codebattle.Task
  alias Codebattle.AssertsService
  alias Codebattle.AssertsService.Result

  def create(params, user, %{"next_state" => next_state}) do
    new_params =
      params
      |> Map.merge(%{
        "origin" => "user",
        "state" => next_state,
        "creator_id" => user.id
      })

    changeset =
      %Task{}
      |> changeset(new_params)

    if next_state == "draft" do
      changeset |> Repo.insert()
    else
      {:ok, changeset.changes}
    end
  end

  def build(%{
        task: task,
        solution_text: solution_text,
        arguments_generator_text: arguments_generator_text,
        editor_lang: editor_lang
      }) do
    case AssertsService.generate_asserts(
           task,
           solution_text,
           arguments_generator_text,
           editor_lang
         ) do
      %Result{status: "ok", asserts: asserts} ->
        {:ok, asserts}

      %Result{status: "failure", asserts: asserts} ->
        {:failure, asserts}

      %Result{status: "error", asserts: asserts, output_error: message} ->
        {:error, asserts, message}
    end
  end

  def update(task, params, _) do
    new_params = params

    task
    |> changeset(new_params)
    |> Repo.update()
  end

  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [
      :name,
      :level,
      :state,
      :origin,
      :asserts,
      :examples,
      :asserts_examples,
      :input_signature,
      :output_signature,
      :description_ru,
      :description_en,
      :solution,
      :arguments_generator,
      :generator_lang,
      :visibility,
      :creator_id
    ])
    |> validate_required([
      :name,
      :level,
      :state,
      :origin,
      :asserts,
      :examples,
      :asserts_examples,
      :input_signature,
      :output_signature,
      :description_en,
      :visibility,
      :creator_id
    ])
    |> validate_inclusion(:state, Task.states())
    |> validate_inclusion(:level, Task.levels())
    |> validate_inclusion(:origin, Task.origin_types())
    |> validate_inclusion(:visibility, Task.visibility_types())
    |> unique_constraint(:name)
  end
end
