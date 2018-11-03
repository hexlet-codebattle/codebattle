#!/usr/local/bin/runghc
import qualified Data.Aeson as A
import qualified Data.ByteString.Lazy.Char8 as BS
import Data.Char
import Data.Maybe
import Control.Exception
import Types
import Solution

main :: IO ()
main = do
    s <- getContents
    let ress = map unmagic $ lines s
    (BS.putStrLn . A.encode $ foldCaseRess ress) `catch` \e -> print (e :: ErrorCall)

unmagic :: String -> CaseRes
unmagic s =  
    case A.decode $ BS.pack s of
        Nothing -> Err "Bad parse!"
        (Just tcase) -> case tcase of 
            Task a e -> if e == [run a solution]
                    then Dummy
                    else Failure a
            Check n -> Ok n
