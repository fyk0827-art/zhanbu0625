-- 全球省市区地址表（由 scripts/extract_geo_locations.py 生成）
CREATE TABLE IF NOT EXISTS geo_locations (
  id INT NOT NULL PRIMARY KEY,
  country VARCHAR(100) NOT NULL,
  province VARCHAR(128) NULL,
  city VARCHAR(100) NOT NULL,
  location_code VARCHAR(50) NOT NULL,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  timezone INT NOT NULL DEFAULT 8,
  INDEX idx_geo_country (country),
  INDEX idx_geo_province (country, province),
  INDEX idx_geo_city (city),
  INDEX idx_geo_search (country, province, city),
  FULLTEXT INDEX ft_geo_search (country, province, city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
