CREATE TRIGGER pvps_updated_at
    BEFORE UPDATE ON pvps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
