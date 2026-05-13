ALTER TABLE support_ticket_sops
  ALTER COLUMN code TYPE VARCHAR(100);

ALTER TABLE support_tickets
  ALTER COLUMN handling_sop_code TYPE VARCHAR(100);
