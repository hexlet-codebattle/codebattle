{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE OverloadedStrings #-}
module Check.Checker where

import qualified Data.Aeson as A
import qualified Data.ByteString.Lazy.Char8 as BS
import Control.Exception
import Check.Solution
import System.Exit

output = BS.putStrLn . A.encode . A.object
handleSuccess res = output ["status" A..= ("success" :: String), "result" A..= res]
handleFailure res args = output ["status" A..= ("failure" :: String), "result" A..= res, "arguments" A..= args]
handleRuntimeError e = output ["status" A..= ("error" :: String), "result" A..= show e]

test :: IO ()
test = do
    let expected1 = 2
    let res1 = solution 1 1

    (if res1 == expected1
        then handleSuccess res1
        else handleFailure res1 ("[1, 1]" :: String))
        `catch` \(e ::ErrorCall) -> handleRuntimeError e

    let expected2 = 8
    let res2 = solution 5 3

    (if res2 == expected2
        then handleSuccess res2
        else handleFailure res2 ("[5, 3]" :: String))
        `catch` \(e ::ErrorCall) -> handleRuntimeError e
