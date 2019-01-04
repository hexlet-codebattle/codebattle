alias Codebattle.Repo
# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Inside the script, you can read and write to any of your
# repositories directly:

# create task for testing, delete after creating admin tools for crud on tasks
# Codebattle.Repo.get_by(Codebattle.Task, id: 1) ||
#     Codebattle.Repo.insert!(%Codebattle.Task{id: 1, description: "test_task"})

# create a bot
# Codebattle.Repo.get_by(Codebattle.User, id: 0) ||
#   Codebattle.Repo.insert!(%Codebattle.User{
#     id: 0,
#     name: "bot",
#     email: "bot@bot.bot",
#     github_id: 0
#   })
#
#

levels = ["elementary", "easy", "medium", "hard"]

1..3
|> Enum.each(fn x ->
  for level <- levels do
    task_name = "task_#{level}_#{:crypto.strong_rand_bytes(10) |> Base.encode32()}"

    task_data = %{
      name: task_name,
      description: "test sum: for ruby `def solution(a,b); a+b;end;`",
      asserts: "{\"arguments\":[1,1],\"expected\":2}
    {\"arguments\":[2,2],\"expected\":4}
    "
    }

    task =
      case Repo.get_by(Codebattle.Task, level: level, name: task_name) do
        nil -> %Codebattle.Task{}
        task -> task
      end

    task
    |> Codebattle.Task.changeset(Map.merge(task_data, %{level: level}))
    |> Repo.insert_or_update!()

    IO.puts("Upsert #{task_name}")
  end
end)

{output, _status} = System.cmd("mix", ["upload_langs"], stderr_to_stdout: true)
IO.puts(output)
