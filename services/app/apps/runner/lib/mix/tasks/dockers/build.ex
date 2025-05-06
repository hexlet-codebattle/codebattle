defmodule Mix.Tasks.Dockers.Build do
  @moduledoc false

  use Mix.Task

  @shortdoc "Build multi-architecture docker runner image"

  def run([slug]) do
    {:ok, _started} = Application.ensure_all_started(:porcelain)
    slug |> Runner.Languages.meta() |> build()
  end

  def run(_) do
    {:ok, _started} = Application.ensure_all_started(:porcelain)
    Runner.Languages.meta() |> Map.values() |> Enum.each(&build/1)
  end

  defp build(%{slug: "ts"}), do: :noop

  defp build(meta) do
    # Ensure buildx is properly set up
    setup_buildx()

    # Always use multi-architecture builds with push
    platforms = "linux/amd64,linux/arm64"
    load_or_push = "--push"

    # Build the image
    command =
      "docker buildx build --platform #{platforms} " <>
        "#{load_or_push} " <>
        "-t #{meta.docker_image} " <>
        "--file #{root()}/apps/runner/dockers/#{meta.slug}/Dockerfile " <>
        "#{root()}/apps/runner/dockers/#{meta.slug}/"

    IO.puts("Command: #{command}")

    IO.puts(
      "Start building image for #{meta.slug}, image: #{meta.docker_image}, platforms: #{platforms}"
    )

    result = Porcelain.shell(command)
    IO.puts(inspect(result))
  end

  defp setup_buildx do
    # Check if the builder exists
    check_builder = Porcelain.shell("docker buildx inspect multi-arch-builder", err: :string)

    if check_builder.status != 0 do
      # Create a new builder instance
      IO.puts("Setting up buildx multi-architecture builder...")

      create_builder =
        Porcelain.shell(
          "docker buildx create --name multi-arch-builder --driver docker-container --bootstrap",
          err: :string
        )

      IO.puts(create_builder.out)

      # Use the new builder
      use_builder = Porcelain.shell("docker buildx use multi-arch-builder", err: :string)
      IO.puts(use_builder.out)
    else
      # Use existing builder
      use_builder = Porcelain.shell("docker buildx use multi-arch-builder", err: :string)
      IO.puts(use_builder.out)
    end
  end

  defp root do
    File.cwd!()
  end
end
