defmodule Mix.Tasks.Images.Build do
  @moduledoc false
  use Mix.Task
  @shortdoc "Build runner images (multi-arch) into the exact <registry/org/name:tag>"

  @default_platforms "linux/amd64,linux/arm64"

  def run([slug]) do
    {:ok, _} = Application.ensure_all_started(:porcelain)
    slug |> Runner.Languages.meta() |> build_one()
  end

  def run(_) do
    {:ok, _} = Application.ensure_all_started(:porcelain)
    Runner.Languages.meta() |> Map.values() |> Enum.each(&build_one/1)
  end

  # skip types we don't build
  defp build_one(%{slug: "ts"}), do: :ok

  defp build_one(%{slug: slug, image: image}) do
    # image must include a tag, e.g. ghcr.io/hexlet-codebattle/ruby:3.4.7
    ensure_tag!(image)

    platforms = System.get_env("PLATFORMS", @default_platforms)
    no_cache = System.get_env("NO_CACHE") in ["1", "true"]
    # "always" | "never" | "missing" | "newer"
    pull_mode = System.get_env("PULL", "always")

    root = File.cwd!()
    dir = Path.join([root, "apps/runner/images", slug])
    file = Path.join(dir, "Containerfile")
    unless File.exists?(file), do: Mix.raise("Containerfile not found: #{file}")

    # --- PRE-CLEAN to avoid exit 125 name collisions ---
    # If this name is already bound to a single-arch image or an old manifest list, remove it.
    _ = Porcelain.shell("podman rmi -f #{shell(image)}", err: :string)
    _ = Porcelain.shell("podman manifest rm #{shell(image)}", err: :string)

    # Build args passthrough: BUILD_ARG_FOO=bar -> --build-arg FOO=bar
    extra_build_args =
      System.get_env()
      |> Enum.filter(fn {k, _} -> String.starts_with?(k, "BUILD_ARG_") end)
      |> Enum.map_join(" ", fn {k, v} ->
        ~s(--build-arg #{String.replace_prefix(k, "BUILD_ARG_", "")}=#{v})
      end)

    cmd =
      [
        "podman build",
        "--platform #{platforms}",
        "--file #{shell(file)}",
        # build directly into EXACT ref
        "--manifest #{shell(image)}",
        "--pull=#{pull_mode}",
        (no_cache && "--no-cache") || "",
        extra_build_args,
        shell(dir)
      ]
      |> Enum.reject(&(&1 == ""))
      |> Enum.join(" ")

    IO.puts("🚧 Building #{image} (#{platforms}) from #{file}")
    res = Porcelain.shell(cmd, err: :string)
    IO.write(res.out)
    IO.write(res.err)
    if res.status != 0, do: Mix.raise("Build failed for #{image} (status #{res.status})")

    # verify local manifest exists under the exact ref
    case Porcelain.shell("podman manifest inspect #{shell(image)}", err: :string) do
      %{status: 0} -> IO.puts("✅ Built manifest: #{image}")
      _ -> Mix.raise("Built image not found as local manifest: #{image}")
    end
  end

  defp ensure_tag!(ref) do
    case Regex.run(~r/^.+?:[^:@]+(?:@.+)?$/, ref) do
      nil -> Mix.raise("meta.image must include a tag (got: #{ref})")
      _ -> :ok
    end
  end

  defp shell(path), do: ~s|"#{path}"|
end
