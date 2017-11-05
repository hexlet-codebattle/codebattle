# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Inside the script, you can read and write to any of your
# repositories directly:

# create task for testing, delete after creating admin tools for crud on tasks
# Codebattle.Repo.get_by(Codebattle.Task, id: 1) ||
    # Codebattle.Repo.insert!(%Codebattle.Task{id: 1, description: "test_task"})

#create a bot
Codebattle.Repo.get_by(Codebattle.User, id: 0) ||
  Codebattle.Repo.insert!(%Codebattle.User{
    id: 0,
    name: "bot",
    email: "bot@bot.bot",
    github_id: 0
  })
#
# We recommend using the bang functions (`insert!`, `update!`
# and so on) as they will fail if something goes wrong.
