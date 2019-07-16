#!/usr/local/bin/runghc
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE OverloadedStrings #-}
import qualified Data.Aeson as A
import qualified Data.ByteString.Lazy.Char8 as BS
import Control.Exception
import Check.Solution
import System.Exit

assertResult (res, expected, args) =  if res == expected
    then Right res
    else Left (res, args)

handleRuntimeError e = print (e :: ErrorCall)

main :: IO ()
main = do
    let expected1 = 2
    let expected2 = 8

    let (res1, args1) = let arg1 = 1; arg2 = 1 in (solution arg1 arg2, [arg1, arg2]) 
    let (res2, args2) = let arg1 = 5; arg2 = 3 in (solution arg1 arg2, [arg1, arg2])

    let ress = [(res1, expected1, args1), (res2, expected2, args2)]
    let testres = mapM assertResult ress 
    either 
        (\(r, a) -> BS.putStrLn . A.encode $ A.object ["status" A..= ("failure" :: String), "result" A..= r, "arguments" A..= a])
        (\_ -> BS.putStrLn . A.encode $ A.object ["status" A..= ("ok" :: String), "result" A..= ("__code-0__" :: String)])
        testres
        `catch` \(e ::ErrorCall) -> BS.putStrLn . A.encode $ A.object ["status" A..= ("error" :: String), "result" A..= show e]
