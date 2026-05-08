ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS first_time_response TIMESTAMP NULL;
