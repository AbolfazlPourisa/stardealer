DROP TRIGGER IF EXISTS groups_updated_at ON users;

CREATE TRIGGER groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
