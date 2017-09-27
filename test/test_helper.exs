ExUnit.start(timeout: 99_999_999)

ExUnit.configure(exclude: [pending: true], trace: true)

Faker.start

Ecto.Adapters.SQL.Sandbox.mode(Codebattle.Repo, :manual)
