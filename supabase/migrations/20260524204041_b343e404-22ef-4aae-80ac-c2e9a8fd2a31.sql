-- Fix search_path security warning for start_world_cup
ALTER FUNCTION public.start_world_cup(_season INTEGER) SET search_path TO public;
