{-# LANGUAGE OverloadedStrings #-}
module Main where

import System.Exit
import Data.Char
import System.Process.Typed
import qualified Data.ByteString as BS (isInfixOf)
import qualified Data.ByteString.Lazy.Char8 as BSL (filter, unpack)

main = do
    (exitCode, dateOut, dateErr) <- readProcess "cabal new-build Checker"
    case exitCode of
        ExitSuccess -> return ()
        (ExitFailure _)-> do
            putStrLn $ "{\"status\": \"error\", \"result\":\"" ++ BSL.unpack (BSL.filter (\c -> ord c < 128 && c /= '\n') dateErr) ++ "\"}"
            exitWith ExitSuccess
