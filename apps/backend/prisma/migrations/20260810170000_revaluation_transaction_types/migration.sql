-- Reference data for store part revaluation. A revaluation restates the carrying value
-- of stock on hand without moving any: REVALUATION_OUT clears the current value and
-- REVALUATION_IN re-lays the same quantity at the new price, so quantity nets to zero.
INSERT INTO "StoreTransactionType" ("type", "is_inbound")
VALUES ('REVALUATION_OUT', false),
       ('REVALUATION_IN', true)
ON CONFLICT ("type") DO NOTHING;
