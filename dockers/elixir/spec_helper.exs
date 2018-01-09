ESpec.configure fn(config) ->
  config.finally fn(_shared) ->
    :ok
  end
end

