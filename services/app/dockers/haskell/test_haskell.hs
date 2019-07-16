#!/usr/local/bin/runghc
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE OverloadedStrings #-}
import Check.Checker
import System.Exit

main :: IO ()
main = do
  test
