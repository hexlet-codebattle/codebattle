%{
  configs: [
    %{
      name: "default",
      color: true,
      files: %{
        included: ["lib/", "src/", "web/", "apps/", "test/"],
        excluded: [~r"/_build/", ~r"/deps/"],
      },
      ignore_checks: [
        {Credo.Check.Readability.ModuleDoc}
      ],
      override_checks: [
        {Credo.Check.Readability.MaxLineLength, priority: :low, max_length: 120}
      ]
    }
  ]
}
