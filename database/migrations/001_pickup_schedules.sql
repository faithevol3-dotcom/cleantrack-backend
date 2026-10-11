USE cleantrack_uganda;

CREATE TABLE IF NOT EXISTS pickup_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  location_id INT NOT NULL,
  waste_category_id INT NOT NULL,
  frequency ENUM('weekly', 'biweekly', 'monthly') NOT NULL,
  start_date DATE NOT NULL,
  notes VARCHAR(200) NULL,
  status ENUM('active', 'paused') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES customer_locations(id) ON DELETE CASCADE,
  FOREIGN KEY (waste_category_id) REFERENCES waste_categories(id)
);
