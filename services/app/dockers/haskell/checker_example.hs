#!/usr/local/bin/runghc
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE OverloadedStrings #-}
import qualified Data.Aeson as A
import qualified Data.ByteString.Lazy.Char8 as BS
import Control.Exception
import Check.Solution
import System.Exit

output = BS.putStrLn . A.encode . A.object
handleOk = output ["status" A..= ("ok" :: String), "result" A..= ("__check_0__" :: String)]
handleSuccess res = output ["status" A..= ("ok" :: String), "result" A..= res]
handleFailure res args = output ["status" A..= ("failure" :: String), "result" A..= res, "arguments" A..= args]
handleRuntimeError e = output ["status" A..= ("error" :: String), "result" A..= show e]

main :: IO ()
main = do
    let expected1 = 2
    let res1 = solution 1 1
    let resAssert1 = expected2 == solution 1 1

    (if resAssert1
        then handleSuccess res1
        else handleFailure res1 ("[1, 1]" :: String))
        `catch` \(e ::ErrorCall) -> handleRuntimeError e

    let expected2 = 8
    let res2 = solution 1 1
    let resAssert2 = expected2 == solution 5 3

    (if resAssert2
        then handleSuccess res2
        else handleFailure res2 ("[5, 3]" :: String))
        `catch` \(e ::ErrorCall) -> handleRuntimeError e

    let final_res = [True, resAssert1, resAssert2]

    if and final_res
        then handleOk
        else output []
        

