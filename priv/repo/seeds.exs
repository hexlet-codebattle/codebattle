umbrella_directory = "./apps/"
seeds_path = "/priv/repo/seeds.exs"

umbrella_directory
|> File.ls!()
|> Enum.filter(&File.dir?(Path.join(umbrella_directory, &1)))
|> Enum.each(fn directory ->
  app_seeds = Path.join([umbrella_directory, directory, seeds_path])

  if File.exists?(app_seeds) do
    Mix.Tasks.Run.run([app_seeds])
  else
    :ok
  end
end)
