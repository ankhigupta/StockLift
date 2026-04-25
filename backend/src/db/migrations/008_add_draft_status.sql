ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_status_check;
ALTER TABLE auctions ADD CONSTRAINT auctions_status_check 
  CHECK (status IN ('DRAFT', 'UPCOMING', 'ACTIVE', 'ENDED', 'SOLD', 'EXPIRED'));