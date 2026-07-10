{:ok, _} = Application.ensure_all_started(:fun_with_flags)

ignore_db_client_disconnects = fn event, _ ->
  message =
    case event do
      %{msg: {:string, message}} ->
        IO.iodata_to_binary(message)

      _ ->
        ""
    end

  if String.contains?(message, "Postgrex.Protocol") and
       String.contains?(message, ") disconnected: ** (DBConnection.ConnectionError) client #PID") do
    :stop
  else
    :ignore
  end
end

:logger.add_primary_filter(:ignore_db_client_disconnects, {ignore_db_client_disconnects, []})

ExUnit.start(capture_log: true, timeout: 99_999_999)
ExUnit.configure(timeout: :infinity, exclude: [pending: true], trace: false)
Ecto.Adapters.SQL.Sandbox.mode(Codebattle.Repo, :manual)
