{-# LANGUAGE FlexibleInstances #-}
{-# LANGUAGE UndecidableInstances #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE OverloadedStrings #-}
module Types where

import Data.Aeson
import Data.Foldable

data Request = Task 
  { taskArguments :: [Value]
  , taskExpected :: [Value]
  } | Check { taskCheck :: Int }
  deriving (Show, Eq)

instance FromJSON Request where
    parseJSON = withObject "Request" $ \o -> asum [ 
        Check <$> (o .: "check"),
        Task <$> (o .: "arguments") <*> (o .: "expected")]

instance ToJSON Request where
    toJSON (Check n) = object ["check" .= n] 
    toJSON (Task a e) = object ["arguments" .= a, "expected" .= e]

data CaseRes = Ok Int | Failure [Value] | Err String | Dummy deriving (Show)

foldCaseRess :: [CaseRes] -> CaseRes
foldCaseRess = foldCaseRess' Dummy 
    where
     foldCaseRess' y [] = y   
     foldCaseRess' y (x@(Err _):xs) = x
     foldCaseRess' y (x@(Failure _):xs) = x 
     foldCaseRess' y (Dummy:xs) = foldCaseRess' y xs
     foldCaseRess' y [x@(Ok _)] = x

instance ToJSON CaseRes where
    toJSON (Ok n) = object ["status" .= ("ok" :: String), "result" .= n]
    toJSON (Failure vs) = object ["status" .= ("failure" :: String), "result" .= vs]
    toJSON (Err s) = object ["status" .= ("error" :: String), "result" .= ("unexpected" :: String)]
    toJSON Dummy = error "Should not be possible!"

class Foo a where
  run :: [Value] -> a -> Value

instance {-# OVERLAPPABLE #-} ToJSON a => Foo a where
  run [] a = toJSON a :: Value
  run _ _ = error "!"

fromResult (Success x) = x
fromResult (Error s) = error s

instance {-# OVERLAPPING #-} (FromJSON a, Foo b) => Foo (a -> b) where
  run (s:ss) f = toJSON $ run ss (f (fromResult $ fromJSON s))
  run _ _ = error "!!"
