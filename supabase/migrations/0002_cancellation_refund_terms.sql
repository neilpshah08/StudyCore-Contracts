-- Add show_cancellation_refund_terms toggle and update existing contracts
-- to keep current behavior (clause shown) by default.
--
-- Run once in the Supabase SQL editor.

alter table public.contracts
  add column if not exists show_cancellation_refund_terms boolean not null default true;
