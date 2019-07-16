#!/usr/local/bin/runghc
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE OverloadedStrings #-}
import qualified Data.Aeson as A
import qualified Data.ByteString.Lazy.Char8 as BS
import Control.Exception
import Check.Solution
import System.Exit

handleRuntimeError e = BS.putStrLn . A.encode $ A.object ["status" A..= ("error" :: String), "result" A..= show e]

main :: IO ()
main = do
    let expected1 = 2
    let res1 = solution 1 1
    
    (if res1 == expected1 
        then BS.putStrLn . A.encode $ A.object ["status" A..= ("ok" :: String), "result" A..= res1]
        else BS.putStrLn . A.encode $ A.object ["status" A..= ("failure" :: String), "result" A..= res1, "arguments" A..= ("[1, 1]" :: String)])
        `catch` \(e ::ErrorCall) -> handleRuntimeError e

    let expected2 = 8
    let res2 = solution 5 3

    (if res2 == expected2 
        then BS.putStrLn . A.encode $ A.object ["status" A..= ("ok" :: String), "result" A..= res2]
        else BS.putStrLn . A.encode $ A.object ["status" A..= ("failure" :: String), "result" A..= res2, "arguments" A..= ("[5, 3]" :: String)])
        `catch` \(e ::ErrorCall) -> handleRuntimeError e
