defmodule Mix.Tasks.Images.Push do
  @shortdoc "Push images to GitHub Container Registry as multi-arch manifests"

  @moduledoc false
  use Mix.Task

  def run([slug]) do
    {:ok, _} = Application.ensure_all_started(:porcelain)
    slug |> Runner.Languages.meta() |> push_one()
  end

  def run(_args) do
    {:ok, _} = Application.ensure_all_started(:porcelain)
    Runner.Languages.meta() |> Map.values() |> Enum.each(&push_one/1)
  end

  # skip types we don't build
  defp push_one(%{slug: "ts"}), do: :ok

  defp push_one(%{slug: slug, image: image}) do
    # e.g. {"ghcr.io/hexlet-codebattle/ruby", "3.4.7"}
    {repo, tag} = parse_ref(image)
    # e.g. "ghcr.io/hexlet-codebattle/ruby:3.4.7"
    full_ref = "#{repo}:#{tag}"

    IO.puts("🔼 Pushing multi-arch manifest for #{slug}: #{full_ref}")

    ensure_local_manifest!(full_ref)

    # Push the manifest as-is (same tag as built)
    push_manifest!(full_ref, full_ref)

    # Optionally push :latest (controlled via env)
    if System.get_env("PUSH_LATEST") in ["1", "true"] and tag != "latest" do
      latest_ref = "#{repo}:latest"
      IO.puts("🔁 Also pushing as #{latest_ref}")
      push_manifest!(full_ref, latest_ref)
    end

    # Optionally push extra tags (comma-separated in EXTRA_TAGS)
    extra_tags =
      "EXTRA_TAGS"
      |> System.get_env("")
      |> String.split(",", trim: true)
      |> Enum.map(&String.trim/1)
      # skip current tag if included
      |> Enum.reject(&(&1 == "" or &1 == tag))

    Enum.each(extra_tags, fn t ->
      dst = "#{repo}:#{t}"
      IO.puts("🔁 Also pushing as #{dst}")
      push_manifest!(full_ref, dst)
    end)
  end

  defp ensure_local_manifest!(ref) do
    case Porcelain.shell("podman manifest inspect #{ref}", err: :string) do
      %{status: 0} -> :ok
      _ -> Mix.raise("Local manifest not found for #{ref}. Run your build task first.")
    end
  end

  defp push_manifest!(local_manifest_tag, remote_tag) do
    cmd = "podman manifest push --all #{local_manifest_tag} docker://#{remote_tag}"
    res = Porcelain.shell(cmd, err: :string)
    IO.write(res.out)
    IO.write(res.err)
    if res.status != 0, do: Mix.raise("Failed to push #{remote_tag} (status #{res.status})")
  end

  # Parses "registry/org/name[:tag][@digest]" → {repo, tag}
  # If no tag is present, defaults to "latest".
  defp parse_ref(ref) do
    case Regex.run(~r/^(.+?)(?::([^:@]+))?(?:@.+)?$/, ref, capture: :all_but_first) do
      [repo] -> {repo, "latest"}
      [repo, tag] -> {repo, tag}
      _ -> raise "Invalid image reference: #{ref}"
    end
  end
end
