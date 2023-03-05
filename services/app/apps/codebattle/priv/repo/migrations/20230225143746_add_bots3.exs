defmodule Codebattle.Repo.Migrations.AddMoreBots3 do
  use Ecto.Migration

  def change do
    names = ~w(
AdaAlgorithm
AgentSmith
AlanTuring
AnakinCodeWalker
AndreyThunder
ArchimedesAI
Architron
AristotleAlgol
BernersLeeBasic
BernoulliBrain
BludniySyn
C3POCode
CharlesDarwin
ChewbaccaCoder
ClaudeShannon
CloneTrooper
CoddCoder
CurieCortex
CyborgCortex
CypherCipher
DarthVaderScript
DennisRitchie
DijkstraData
EckertEDSAC
EinsteinElixir
EinsteinEngine
FermatFortran
GraceHopper
HanHaskell
HawkingHive
HopperHaskell
JacksonJava
JarJarJava
Jediscript
JohnVonNeumann
KelvinKortex
KirillQA
KnuthKernel
Leialisp
LinusTorvalds
LiskovLambda
LovelaceLisp
LovelaceLogic
LukeLambda
MaceWinduMachine
MaksimDev
MasterYoda
MorpheusModule
MorseMachine
MouseMachine
NaiHarn
NashNet
NatashaTHEBEST
NebuchadnezzarNet
NeoNet
NewtonNode
ObiWanOCaml
OracleOcaml
PadmePython
PascalProlog
Patong
PerlPioneer
PlanckPascal
PlanckProcessor
PostgresPostulate
R2D2Redux
Ramanujan
ReyReact
RichardFeynman
RitchieRuby
RumbaughRexx
SchrödingerScheme
SchrödingerScript
ShannonShell
ShannonSonic
Sinbi
StephenWolfram
Stormtrooper
SutherlandSmalltalk
TeslaTech
TheOnePython
ThompsonTeX
TimBernersLee
TrinityToken
TuringTested
VintCerf
WatsonWiz
WeinbergWeb
WirthWASP
WozniakWizard
YodaYacc
ZemanekZPL
ZuseZinger
xXxKolyanxXx
AndreyAntibiotik
)
    bot_ids = -42..(-42 - Enum.count(names))
    utc_now = NaiveDateTime.utc_now() |> NaiveDateTime.truncate(:second)

    bots =
      bot_ids
      |> Enum.zip(names)
      |> Enum.map(fn {id, name} ->
        %{
          id: id,
          name: name,
          email: "#{name}@bot.codebattle",
          is_bot: true,
          rating: 1200,
          avatar_url: "/assets/images/logo.svg",
          lang: "ruby",
          achievements: ["bot"],
          inserted_at: utc_now,
          updated_at: utc_now
        }
      end)

    Codebattle.Repo.insert_all(Codebattle.User, bots)
  end
end
