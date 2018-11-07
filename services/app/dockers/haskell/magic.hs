{-# LANGUAGE OverloadedStrings #-}
module Main where 

import  System.Exit
import  System.Process.Typed
import  qualified Data.ByteString as BS (isInfixOf)
import  qualified Data.ByteString.Lazy.Char8 as BSL (toStrict, unpack)
  
main = do
    (exitCode, dateOut, dateErr) <- readProcess "cabal new-build Checker"
    case exitCode of 
        ExitSuccess -> return ()
        (ExitFailure _)-> do 
            print $ "{ \"status\": \"error\", \"result\":\"" ++ BSL.unpack dateErr ++ "\"}"
            exitWith (ExitFailure 1)