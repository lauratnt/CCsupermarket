
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  password TEXT
);


CREATE TABLE IF NOT EXISTS user_cart (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  external_product_id INTEGER,
  external_product_database TEXT,
  quantity INTEGER,
  productName TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO users (username, password) VALUES
  ('admin', '$2b$10$Tu4kD4Vgub.D78gJnNVvrO4weM/kf9Fp6x/B4eKqSFRifp67GADfa'), 
  ('user1', '$2b$10$Tu4kD4Vgub.D78gJnNVvrO4weM/kf9Fp6x/B4eKqSFRifp67GADfa'), 
  ('user2', '$2b$10$Tu4kD4Vgub.D78gJnNVvrO4weM/kf9Fp6x/B4eKqSFRifp67GADfa'); --dati prova
