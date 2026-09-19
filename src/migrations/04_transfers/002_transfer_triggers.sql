DROP TRIGGER IF EXISTS transfers_updated_at ON transfers;

CREATE TRIGGER transfers_updated_at
    BEFORE UPDATE ON transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
