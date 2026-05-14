PRAGMA foreign_keys = ON;

INSERT INTO angajati (id, nume, prenume, email, departament) VALUES
  ('a1', 'Popescu', 'Ion', 'ion.popescu@company.ro', 'IT'),
  ('a2', 'Ionescu', 'Maria', 'maria.ionescu@company.ro', 'HR'),
  ('a3', 'Georgescu', 'Andrei', 'andrei.georgescu@company.ro', 'IT');

INSERT INTO magazii (id, nume, locatie) VALUES
  ('m1', 'Magazie Centrala', 'Etaj 1, Camera 101'),
  ('m2', 'Magazie IT', 'Etaj 2, Camera 210');

INSERT INTO echipamente (id, serial, denumire, tip, producator, model, data_achizitie, valoare, status, magazie_id) VALUES
  ('e1', 'SN-001-DELL', 'Laptop Dell Dev', 'laptop', 'Dell', 'Latitude 5520', '2019-01-15', 4500.00, 'disponibil', 'm1'),
  ('e2', 'SN-002-HP', 'Desktop HP HR', 'desktop', 'HP', 'EliteDesk 800', '2021-06-10', 3200.00, 'disponibil', 'm1'),
  ('e3', 'SN-003-LEN', 'Laptop Lenovo Test', 'laptop', 'Lenovo', 'ThinkPad T14', '2020-03-20', 5000.00, 'disponibil', 'm2');

INSERT INTO componente_echipamente (id, echipament_id, tip, descriere, serial_componenta) VALUES
  ('c1', 'e1', 'RAM', 'Kingston 16GB DDR4', 'KNG-RAM-001'),
  ('c2', 'e1', 'SSD', 'Samsung 512GB NVMe', 'SAM-SSD-001'),
  ('c3', 'e2', 'RAM', 'Corsair 8GB DDR4', 'COR-RAM-001');