import { hashPassword } from "../lib/crypto";
import { query } from "./pool";

export async function seedLocalAdminUser() {
    const hashedPassword = await hashPassword("password");

    await query(INSERT_LOCAL_ADMIN_USER, [hashedPassword]);
}

const INSERT_LOCAL_ADMIN_USER = `
INSERT INTO users (username, email, password_hash, is_admin)
VALUES (
  'testadmin',
  'testadmin@gmail.com',
  $1,
  TRUE
)
ON CONFLICT (email) DO NOTHING;
`;
