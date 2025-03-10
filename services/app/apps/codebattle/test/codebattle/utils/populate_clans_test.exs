defmodule Codebattle.Utils.PopulateClansTest do
  use Codebattle.DataCase, async: true

  test "from_csv" do
    csv = """
    long,short
    "the first clan",first_clan
    secondclan,clan2
    """

    {fd, path} = Temp.open!()
    IO.write(fd, csv)
    File.close(fd)

    assert :ok = Codebattle.Utils.PopulateClans.from_csv!(path)
    assert %{long_name: "the first clan"} = Codebattle.Clan.get_by_name!("first_clan")
  end
end
