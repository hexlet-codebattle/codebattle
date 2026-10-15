defmodule Codebattle.CodeCheck.RunLogger do
  @moduledoc false

  alias Codebattle.CodeCheck.Run
  alias Codebattle.Repo

  require Logger

  def log_async(attrs) do
    Task.async(fn ->
      %Run{}
      |> Run.changeset(attrs)
      |> Repo.insert()
      |> case do
        {:ok, _run} ->
          :ok

        {:error, changeset} ->
          Logger.warning("Could not persist code check run: #{inspect(changeset.errors)}")
          :error
      end
    end)

    :ok
  rescue
    error ->
      Logger.warning("Could not start code check run logger task: #{inspect(error)}")
      :error
  end
end
