
CREATE TABLE IF NOT EXISTS supermarkets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  password TEXT,
  name TEXT,
  location TEXT
);

-- dati prova
INSERT INTO supermarkets (username, password, name, location) VALUES
  ('market1', '$2b$10$Tu4kD4Vgub.D78gJnNVvrO4weM/kf9Fp6x/B4eKqSFRifp67GADfa', 'Supermarket 1', 'City 1'),
  ('market2', '$2b$10$Tu4kD4Vgub.D78gJnNVvrO4weM/kf9Fp6x/B4eKqSFRifp67GADfa', 'Supermarket 2', 'City 2'),
  ('market3', '$2b$10$Tu4kD4Vgub.D78gJnNVvrO4weM/kf9Fp6x/B4eKqSFRifp67GADfa', 'Supermarket 3', 'City 3');
