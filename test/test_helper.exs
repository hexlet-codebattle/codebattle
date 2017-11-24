ExUnit.start(timeout: 99_999_999)

ExUnit.configure(timeout: :infinity, exclude: [pending: true], trace: false)

Faker.start

Ecto.Adapters.SQL.Sandbox.mode(Codebattle.Repo, :manual)
