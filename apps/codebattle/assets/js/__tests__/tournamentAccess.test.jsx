import {
  getTournamentAccessToken,
  getTournamentJoinPayload,
} from "../widgets/utils/tournamentAccess";

test("getTournamentAccessToken returns access token from query string", () => {
  expect(getTournamentAccessToken("?access_token=abc123")).toEqual("abc123");
});

test("getTournamentJoinPayload includes accessToken when provided", () => {
  expect(getTournamentJoinPayload("?foo=bar&access_token=abc123")).toEqual({
    access_token: "abc123",
  });
});

test("getTournamentJoinPayload returns empty payload without access token", () => {
  expect(getTournamentJoinPayload("?foo=bar")).toEqual({});
});

test("getTournamentJoinPayload uses fallback token when query token is missing", () => {
  expect(getTournamentJoinPayload("?foo=bar", "fallback-token")).toEqual({
    access_token: "fallback-token",
  });
});

test("getTournamentJoinPayload handles non-string fallback token", () => {
  expect(getTournamentJoinPayload("?foo=bar", null)).toEqual({});
});
