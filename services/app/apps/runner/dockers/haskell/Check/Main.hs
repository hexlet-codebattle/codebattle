#!/usr/local/bin/runghc
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE OverloadedStrings #-}
import Checker
import System.Exit

main :: IO ()
main = do
  test
