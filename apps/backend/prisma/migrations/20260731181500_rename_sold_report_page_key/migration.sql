-- Repoints saved views for the renamed Sold Report page (now Model Price History).
UPDATE "SavedView" SET "page_key" = 'model_price_history' WHERE "page_key" = 'sold_report';
